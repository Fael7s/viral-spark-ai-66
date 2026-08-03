// @vitest-environment node
//
// Exercita o handler REAL de /api/public/stripe-webhook, invocando a funcao
// exportada pela rota. Complementa webhook.test.ts, que reimplementa a logica
// inline e por isso nao cobre o contrato de status HTTP do handler de verdade.
//
// Nenhuma credencial real e usada: o webhook secret e o user id sao gerados
// localmente por crypto, o Supabase e um stub HTTP em 127.0.0.1, a Stripe e
// substituida por um stub que preserva apenas a verificacao de assinatura
// (HMAC local, sem rede), e uma trava em globalThis.fetch aborta qualquer
// tentativa de contato com host que nao seja loopback.
//
// O contrato verificado aqui:
// - falha na consulta de idempotencia  -> 500 (Stripe reenvia)
// - falha no upsert de subscriptions   -> 500 (Stripe reenvia)
// - falha apenas na marcacao final     -> 200 (upgrade ja aplicado)
// - caminho de sucesso                 -> 200
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import Stripe from "stripe";
import { fetch as realFetch } from "undici";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

const fakeWebhookSecret = "whsec_" + crypto.randomBytes(24).toString("hex");
const fakeUserId = crypto.randomUUID();

vi.mock("@/lib/stripe.server", async () => {
  const StripeMod = (await import("stripe")).default;
  // Instanciar nao faz rede. A chave e ficticia e nunca sai do processo.
  const inst = new StripeMod("sk_test_" + "0".repeat(24));
  return {
    getStripe: () => ({
      webhooks: {
        constructEventAsync: inst.webhooks.constructEventAsync.bind(inst.webhooks),
      },
      subscriptions: {
        retrieve: async (id: string) => ({
          id,
          status: "active",
          items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 2592000 }] },
        }),
      },
    }),
  };
});

const attemptedHosts: string[] = [];

function installNetworkGuard() {
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    const host = new URL(url).hostname;
    attemptedHosts.push(host);
    if (host !== "127.0.0.1" && host !== "localhost") {
      throw new Error(`TRAVA DE REDE: contato com host externo bloqueado (${host})`);
    }
    // Os tipos de RequestInit do DOM e do undici divergem em `body`; o valor
    // repassado e o mesmo objeto recebido, sem alteracao.
    return realFetch(url, init as Parameters<typeof realFetch>[1]) as unknown as Promise<Response>;
  }) as typeof fetch;
}

/** Resposta que o stub do Supabase deve dar a cada rota do PostgREST. */
interface SupabaseStubPlan {
  /** GET em processed_webhooks: consulta de idempotencia. */
  idempotency?: { status: number; body: unknown };
  /** POST em subscriptions: o upsert do upgrade. */
  upsert?: { status: number; body: unknown };
  /** POST em processed_webhooks: a marcacao final. */
  mark?: { status: number; body: unknown };
}

async function startSupabaseStub(plan: SupabaseStubPlan) {
  const calls: string[] = [];
  const srv = createServer((req, res) => {
    const url = req.url ?? "";
    const method = req.method ?? "";
    let reply = { status: 200, body: [] as unknown };
    if (method === "GET" && url.includes("processed_webhooks")) {
      calls.push("idempotency");
      reply = plan.idempotency ?? { status: 200, body: null };
    } else if (method === "POST" && url.includes("subscriptions")) {
      calls.push("upsert");
      reply = plan.upsert ?? { status: 201, body: [] };
    } else if (method === "POST" && url.includes("processed_webhooks")) {
      calls.push("mark");
      reply = plan.mark ?? { status: 201, body: [] };
    }
    res.writeHead(reply.status, { "content-type": "application/json" });
    res.end(JSON.stringify(reply.body));
  });
  const port = await new Promise<number>((resolve) => {
    srv.listen(0, "127.0.0.1", () => resolve((srv.address() as AddressInfo).port));
  });
  return { srv, port, calls };
}

function buildSignedRequest() {
  const payload = JSON.stringify({
    id: "evt_isolated_" + crypto.randomBytes(8).toString("hex"),
    object: "event",
    api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000),
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_isolated_" + crypto.randomBytes(8).toString("hex"),
        object: "checkout.session",
        mode: "subscription",
        subscription: "sub_isolated_" + crypto.randomBytes(8).toString("hex"),
        customer: "cus_isolated_" + crypto.randomBytes(8).toString("hex"),
        client_reference_id: fakeUserId,
        metadata: { supabase_user_id: fakeUserId },
      },
    },
  });
  const header = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: fakeWebhookSecret,
  });
  return new Request("https://exemplo.invalido/api/public/stripe-webhook", {
    method: "POST",
    headers: { "stripe-signature": header, "content-type": "application/json" },
    body: payload,
  });
}

async function invokeHandler(): Promise<Response> {
  vi.resetModules();
  const mod = await import("@/routes/api/public/stripe-webhook");
  // A rota nao expoe os handlers em tipos publicos; alcancamos o POST real
  // pela forma conhecida do objeto de opcoes.
  const route = mod.Route as unknown as {
    options: {
      server: { handlers: { POST: (ctx: { request: Request }) => Promise<Response> } };
    };
  };
  return route.options.server.handlers.POST({ request: buildSignedRequest() });
}

const invalidKeyBody = { message: "Invalid API key", hint: null, code: "401" };

describe("webhook: contrato de status HTTP em falhas de escrita", () => {
  let stub: { srv: Server; port: number; calls: string[] } | undefined;

  beforeEach(() => {
    attemptedHosts.length = 0;
    installNetworkGuard();
    process.env.STRIPE_WEBHOOK_SECRET = fakeWebhookSecret;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-key-for-isolated-test";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (stub) {
      await new Promise<void>((resolve) => stub!.srv.close(() => resolve()));
      stub = undefined;
    }
    // Nenhum host externo pode ter sido contatado em nenhum cenario.
    expect(attemptedHosts.every((h) => h === "127.0.0.1" || h === "localhost")).toBe(true);
  });

  async function run(plan: SupabaseStubPlan) {
    stub = await startSupabaseStub(plan);
    process.env.SUPABASE_URL = `http://127.0.0.1:${stub.port}`;
    return invokeHandler();
  }

  it("falha na consulta de idempotencia retorna 500 e nao escreve nada", async () => {
    const res = await run({ idempotency: { status: 401, body: invalidKeyBody } });
    expect(res.status).toBe(500);
    // Nao deve ter prosseguido para o upsert nem para a marcacao.
    expect(stub!.calls).toEqual(["idempotency"]);
  });

  it("falha no upsert de subscriptions retorna 500 e nao marca o evento", async () => {
    const res = await run({ upsert: { status: 401, body: invalidKeyBody } });
    expect(res.status).toBe(500);
    expect(stub!.calls).toEqual(["idempotency", "upsert"]);
    // A marcacao final nunca deve acontecer se o upgrade falhou.
    expect(stub!.calls).not.toContain("mark");
  });

  it("falha apenas na marcacao final ainda retorna 200", async () => {
    const res = await run({ mark: { status: 500, body: { message: "boom", code: "XX000" } } });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    // O upgrade foi aplicado; so a marcacao falhou.
    expect(stub!.calls).toEqual(["idempotency", "upsert", "mark"]);
  });

  it("caminho de sucesso completo retorna 200", async () => {
    const res = await run({});
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(stub!.calls).toEqual(["idempotency", "upsert", "mark"]);
  });
});
