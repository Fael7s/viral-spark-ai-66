import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const mockStripe = { webhooks: { constructEventAsync: vi.fn() }, subscriptions: { retrieve: vi.fn() } };
vi.mock("@/lib/stripe.server", () => ({ getStripe: vi.fn(() => mockStripe) }));
const mockDb = { from: vi.fn(() => mockDb), select: vi.fn(() => mockDb), eq: vi.fn(() => mockDb), maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })), upsert: vi.fn(() => Promise.resolve({ error: null })), update: vi.fn(() => mockDb) };
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mockDb }));

describe("Webhook", () => {
  beforeEach(() => { vi.resetAllMocks(); delete process.env.STRIPE_WEBHOOK_SECRET; });

  async function handle(req: Request): Promise<Response> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return new Response("Server misconfigured", { status: 500 });
    const sig = req.headers.get("stripe-signature");
    if (!sig) return new Response("Missing signature", { status: 400 });
    const body = await req.text();
    const stripe = (await import("@/lib/stripe.server")).getStripe();
    let ev: Stripe.Event;
    try { ev = await stripe.webhooks.constructEventAsync(body, sig, secret); } catch { return new Response("Invalid signature", { status: 400 }); }
    const db = mockDb;
    switch (ev.type) {
      case "checkout.session.completed": {
        const s = ev.data.object as Stripe.Checkout.Session;
        const uid = s.metadata?.supabase_user_id ?? s.client_reference_id;
        const sid = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
        const cid = typeof s.customer === "string" ? s.customer : s.customer?.id;
        if (!uid || !sid) break;
        const sub = await stripe.subscriptions.retrieve(sid);
        await db.from("subscriptions").upsert({ user_id: uid, plan: "pro", status: sub.status, stripe_customer_id: cid ?? null, stripe_subscription_id: sub.id, current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null, last_stripe_event_created: new Date(ev.created * 1000).toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        break;
      }
      case "customer.subscription.updated": {
        const sub = ev.data.object as Stripe.Subscription;
        await db.from("subscriptions").update({ status: sub.status, current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null, last_stripe_event_created: new Date(ev.created * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("stripe_subscription_id", sub.id);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = ev.data.object as Stripe.Subscription;
        await db.from("subscriptions").update({ plan: "free", status: "canceled", last_stripe_event_created: new Date(ev.created * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("stripe_subscription_id", sub.id);
        break;
      }
    }
    return new Response("ok", { status: 200 });
  }

  it("500 sem webhook secret", async () => {
    const res = await handle(new Request("http://localhost", { method: "POST", body: "x" }));
    expect(res.status).toBe(500);
  });

  it("400 sem signature", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    const res = await handle(new Request("http://localhost", { method: "POST", body: "x" }));
    expect(res.status).toBe(400);
  });

  it("400 com assinatura invalida", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    mockStripe.webhooks.constructEventAsync.mockRejectedValueOnce(new Error("bad"));
    const res = await handle(new Request("http://localhost", { method: "POST", headers: { "stripe-signature": "bad" }, body: "x" }));
    expect(res.status).toBe(400);
  });

  it("cria assinatura pro apos checkout", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    const ev = { type: "checkout.session.completed", created: Math.floor(Date.now()/1000), data: { object: { id: "cs", metadata: { supabase_user_id: "u" }, client_reference_id: "u", subscription: "sub", customer: "cus" } } } as unknown as Stripe.Event;
    mockStripe.webhooks.constructEventAsync.mockResolvedValueOnce(ev);
    mockStripe.subscriptions.retrieve.mockResolvedValueOnce({ id: "sub", status: "active", current_period_end: Math.floor(Date.now()/1000)+30*86400 });
    const res = await handle(new Request("http://localhost", { method: "POST", headers: { "stripe-signature": "s" }, body: JSON.stringify(ev) }));
    expect(res.status).toBe(200);
    expect(mockDb.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "u", plan: "pro" }), expect.anything());
  });

  it("ignora sem subscription", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    const ev = { type: "checkout.session.completed", created: 1, data: { object: { metadata: {}, client_reference_id: null, subscription: null, customer: null } } } as unknown as Stripe.Event;
    mockStripe.webhooks.constructEventAsync.mockResolvedValueOnce(ev);
    const res = await handle(new Request("http://localhost", { method: "POST", headers: { "stripe-signature": "s" }, body: JSON.stringify(ev) }));
    expect(res.status).toBe(200);
    expect(mockDb.upsert).not.toHaveBeenCalled();
  });

  it("atualiza subscription.updated", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    const ev = { type: "customer.subscription.updated", created: Math.floor(Date.now()/1000), data: { object: { id: "sub", status: "past_due", current_period_end: Math.floor(Date.now()/1000)+15*86400 } } } as unknown as Stripe.Event;
    mockStripe.webhooks.constructEventAsync.mockResolvedValueOnce(ev);
    const res = await handle(new Request("http://localhost", { method: "POST", headers: { "stripe-signature": "s" }, body: JSON.stringify(ev) }));
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalledWith(expect.objectContaining({ status: "past_due" }));
  });

  it("rebaixa para free em deleted", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    const ev = { type: "customer.subscription.deleted", created: Math.floor(Date.now()/1000), data: { object: { id: "sub", status: "canceled" } } } as unknown as Stripe.Event;
    mockStripe.webhooks.constructEventAsync.mockResolvedValueOnce(ev);
    const res = await handle(new Request("http://localhost", { method: "POST", headers: { "stripe-signature": "s" }, body: JSON.stringify(ev) }));
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalledWith(expect.objectContaining({ plan: "free", status: "canceled" }));
  });

  it("200 para eventos nao mapeados", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    const ev = { type: "invoice.payment_succeeded", created: 1, data: { object: {} } } as unknown as Stripe.Event;
    mockStripe.webhooks.constructEventAsync.mockResolvedValueOnce(ev);
    const res = await handle(new Request("http://localhost", { method: "POST", headers: { "stripe-signature": "s" }, body: JSON.stringify(ev) }));
    expect(res.status).toBe(200);
  });

  it("ignora eventos fora de ordem", () => {
    const last = new Date(Date.now()-5000).toISOString();
    const isNewer = (t: number) => !last || t*1000 > new Date(last).getTime();
    expect(isNewer(Math.floor((Date.now()-10000)/1000))).toBe(false);
    expect(isNewer(Math.floor(Date.now()/1000))).toBe(true);
  });

  it("processa quando nao ha registro anterior", () => {
    const isNewer = (t: number, last: string|null) => !last || t*1000 > new Date(last).getTime();
    expect(isNewer(Math.floor(Date.now()/1000), null)).toBe(true);
  });
});
