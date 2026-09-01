import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { buildMessages, callAiGateway, ERROR_MESSAGES } from "./generate.server";
import { TOPIC_MIN_LENGTH } from "./generate.functions";

export const DEMO_TOPIC_MAX_LENGTH = 300;
export const DEMO_DAILY_LIMIT_PER_IP = 3;

export const DEMO_ERROR_MESSAGES: Record<string, string> = {
  ...ERROR_MESSAGES,
  DEMO_TOPIC_TOO_LONG: "O texto passou de 300 caracteres. Encurta a descrição.",
  DEMO_LIMIT_REACHED: "Limite de demonstração atingido. Crie sua conta grátis para continuar.",
};

const demoInputSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(TOPIC_MIN_LENGTH, "TOPIC_TOO_SHORT")
    .max(DEMO_TOPIC_MAX_LENGTH, "DEMO_TOPIC_TOO_LONG"),
});

/**
 * Um octeto decimal de IPv4: 0, ou 1-999 sem zero a esquerda. O limite de 255
 * e conferido depois, numericamente.
 *
 * Zero a esquerda e rejeitado de proposito. "010" e lido como 8 por parsers que
 * interpretam octal e como 10 pelos que nao interpretam (a ambiguidade esta
 * descrita na RFC 6943, secao 3.1.1). Aceitar as duas grafias daria dois baldes
 * de rate limit distintos para o mesmo host.
 */
const IPV4_OCTET = /^(?:0|[1-9]\d{0,2})$/;

const IPV6_GROUP = /^[0-9A-Fa-f]{1,4}$/;

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => IPV4_OCTET.test(part) && Number(part) <= 255);
}

/**
 * Valida IPv6 pela estrutura da RFC 4291, secao 2.2: oito grupos de 1 a 4
 * digitos hexadecimais, com no maximo uma ocorrencia de "::" abreviando um ou
 * mais grupos zerados, e com a forma opcional de IPv4 embutido no final
 * (::ffff:192.0.2.1), que ocupa dois grupos.
 *
 * Zone id (RFC 6874, "%eth0") e recusado: escopo de link nao chega de um
 * cliente remoto, e aceita-lo abriria variacao textual para o mesmo host.
 *
 * Nao normaliza. "2001:db8::1" e "2001:DB8:0:0:0:0:0:1" sao o mesmo endereco e
 * continuam produzindo hashes diferentes. Em producao o valor vem de
 * cf-connecting-ip, que a borda emite numa forma so, entao a divergencia nao
 * aparece; normalizar de verdade exigiria implementar a RFC 5952 inteira, o que
 * esta fora do escopo desta correcao.
 */
function isIpv6(value: string): boolean {
  if (value.includes("%")) return false;

  const halves = value.split("::");
  if (halves.length > 2) return false;
  const compressed = halves.length === 2;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = compressed && halves[1] ? halves[1].split(":") : [];
  const groups = [...head, ...tail];

  let count = groups.length;
  const last = groups[groups.length - 1];
  if (last !== undefined && last.includes(".")) {
    if (!isIpv4(last)) return false;
    // O quad-dotted final ocupa dois dos oito grupos.
    count += 1;
    groups.pop();
  }
  if (!groups.every((group) => IPV6_GROUP.test(group))) return false;

  return compressed ? count < 8 : count === 8;
}

/**
 * Devolve o valor so quando ele e um endereco IP bem formado; caso contrario,
 * null, para que quem chama caia na proxima fonte.
 *
 * A validacao e escrita aqui em vez de usar isIP de node:net por uma razao
 * verificada, nao por preferencia. O build (nitro, alvo cloudflare) externaliza
 * os builtins node: e roda sob nodejs_compat, mas a camada de polyfill unenv,
 * presente na arvore de build, implementa net.isIP com duas regex: a de IPv4
 * nao confere faixa e aceita 999.999.999.999, e a de IPv6 so casa com a forma
 * expandida de oito grupos, rejeitando todo endereco comprimido, que e
 * justamente o que a borda emite. Sob essa implementacao a falha seria
 * silenciosa: todo visitante IPv6 cairia no balde compartilhado "unknown".
 * Uma funcao pura se comporta igual em dev, preview e producao.
 *
 * As regex sao lineares e sem quantificador aninhado, entao nao ha backtracking
 * catastrofico com entrada longa vinda de header.
 */
function parseIpCandidate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isIpv4(trimmed) || isIpv6(trimmed) ? trimmed : null;
}

/**
 * Fontes do IP do cliente, em ordem de confianca.
 *
 * cf-connecting-ip vem primeiro porque e escrito pela borda a partir do peer da
 * conexao e sobrescrito a cada requisicao: um valor forjado pelo cliente e
 * descartado. E o mesmo header ja usado pelo rate limiter em
 * src/routes/api/public/stripe-webhook.ts, no mesmo runtime.
 *
 * x-forwarded-for e x-real-ip continuam como fallback porque preview e
 * desenvolvimento local nao passam pela borda e nao tem cf-connecting-ip;
 * remove-los quebraria o demo fora de producao. Os dois sao controlaveis pelo
 * cliente: x-forwarded-for e uma lista de append, e o elemento [0] lido aqui e
 * exatamente o que o cliente alegou; x-real-ip e convencao de nginx e ninguem
 * neste caminho o escreve. Com cf-connecting-ip presente e valido, nenhum dos
 * dois chega a ser consultado.
 *
 * Exportada para teste. Nao e usada fora deste modulo.
 */
export function getClientIp(request: Request): string {
  const edgeIp = parseIpCandidate(request.headers.get("cf-connecting-ip"));
  if (edgeIp) return edgeIp;

  const forwarded = parseIpCandidate(request.headers.get("x-forwarded-for")?.split(",")[0]);
  if (forwarded) return forwarded;

  const realIp = parseIpCandidate(request.headers.get("x-real-ip"));
  if (realIp) return realIp;

  return "unknown";
}

function hashIp(ip: string): string {
  const salt = process.env.DEMO_IP_HASH_SALT ?? "viral-caption-demo";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Server function pública e separada de generateContent (lib/generate.functions.ts):
 * sem middleware de auth, sem escrita em public.generations, sem tocar em
 * usage_limits/subscriptions. Tem sua própria tabela de rate limit
 * (public.demo_generation_limits), aplicada no servidor via RPC antes de
 * qualquer chamada ao modelo de IA.
 */
export const generateDemoContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const parsed = demoInputSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[generate-demo] input validation failed", {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message,
        })),
      });
      throw parsed.error;
    }
    return parsed.data;
  })
  .handler(async ({ data }) => {
    const request = getRequest();
    const ip = getClientIp(request);
    const ipHash = hashIp(ip);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>;
    };

    const { data: consumed, error: consumeError } = await admin.rpc("consume_demo_generation", {
      _ip_hash: ipHash,
      _daily_limit: DEMO_DAILY_LIMIT_PER_IP,
    });
    if (consumeError) {
      console.error("[generate-demo] consume_demo_generation error", consumeError);
      throw new Error("AI_ERROR");
    }
    const usage = consumed as { allowed: boolean };
    if (!usage.allowed) {
      throw new Error("DEMO_LIMIT_REACHED");
    }

    try {
      const messages = buildMessages({
        platform: "tiktok",
        tone: "motivacional",
        topic: data.topic,
        transcript: undefined,
      });
      return await callAiGateway(messages);
    } catch (err) {
      try {
        await admin.rpc("refund_demo_generation", { _ip_hash: ipHash });
      } catch (refundErr) {
        console.error("[generate-demo] refund_demo_generation failed", refundErr);
      }
      throw err;
    }
  });
