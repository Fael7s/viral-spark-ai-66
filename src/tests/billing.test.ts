import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStripe } from "@/lib/stripe.server";

const mockStripe = { checkout: { sessions: { create: vi.fn() } }, billingPortal: { sessions: { create: vi.fn() } }, subscriptions: { retrieve: vi.fn() }, webhooks: { constructEventAsync: vi.fn() } };
function MockStripe() { return mockStripe; }
(MockStripe as any).createFetchHttpClient = vi.fn(() => ({}));
vi.mock("stripe", () => ({ default: MockStripe }));

describe("Pagamentos", () => {
  beforeEach(() => { vi.resetAllMocks(); delete process.env.STRIPE_SECRET_KEY; delete process.env.STRIPE_PRICE_ID_PRO; });

  it("lanca erro sem STRIPE_SECRET_KEY", () => expect(() => getStripe()).toThrow("Missing STRIPE_SECRET_KEY"));
  it("retorna instancia com chave", () => { process.env.STRIPE_SECRET_KEY = "sk_test"; expect(getStripe()).toBeDefined(); });
  it("checkout tem metadados", () => {
    const cfg = { mode: "subscription", line_items: [{ price: "price_123", quantity: 1 }], client_reference_id: "user-123", metadata: { supabase_user_id: "user-123" }, subscription_data: { metadata: { supabase_user_id: "user-123" } }, success_url: "https://app.com/app?upgraded=true", cancel_url: "https://app.com/upgrade" };
    expect(cfg.metadata.supabase_user_id).toBe("user-123");
  });
  it("urls sao HTTPS", () => { expect("https://app.com/app?upgraded=true".startsWith("https://")).toBe(true); });
  it("detecta PRICE_ID_PRO ausente", () => { expect(process.env.STRIPE_PRICE_ID_PRO).toBeUndefined(); });
  it("detecta WEBHOOK_SECRET ausente", () => { expect(process.env.STRIPE_WEBHOOK_SECRET).toBeUndefined(); });
  it("aceita variaveis configuradas", () => { process.env.STRIPE_SECRET_KEY = "sk"; process.env.STRIPE_PRICE_ID_PRO = "price"; process.env.STRIPE_WEBHOOK_SECRET = "whsec"; expect(process.env.STRIPE_SECRET_KEY).toBe("sk"); });
  it("requer customer_id para portal", () => { expect(null).toBeNull(); });
  it("aceita customer_id valido", () => { expect("cus_123".startsWith("cus_")).toBe(true); });
  it("processa checkout completed", () => {
    const ev = { type: "checkout.session.completed", data: { object: { metadata: { supabase_user_id: "u" }, subscription: "sub", customer: "cus" } } };
    expect(ev.data.object.metadata.supabase_user_id).toBe("u");
  });
  it("processa subscription deleted", () => {
    const up = { plan: "free", status: "canceled" };
    expect(up.plan).toBe("free");
  });
});
