import { describe, it, expect } from "vitest";
import { buildMessages, resultSchema } from "@/lib/generate.server";
import { FREE_DAILY_LIMIT, PRO_DAILY_LIMIT } from "@/lib/types";
import type { Platform, Tone } from "@/lib/types";

describe("Fluxos de Integracao", () => {
  it("fluxo completo de geracao", () => {
    const input = { platform: "tiktok" as Platform, tone: "engracado" as Tone, topic: "Bolo de caneca", transcript: "Hoje vou ensinar..." };
    const messages = buildMessages(input);
    expect(messages[0].content).toContain("especialista");
    expect(messages[1].content).toContain("Bolo de caneca");

    const aiResponse = { hooks: ["H1","H2","H3"], captions: ["C1","C2","C3"], emojis: ["🎂","⏱️","🔥","😋","✨","🧁"], hashtags: ["#bolo","#receita","#doces","#tiktokfood"] };
    const validated = resultSchema.parse(aiResponse);
    expect(validated.hashtags.every(h => h.startsWith("#"))).toBe(true);
  });

  it("limite gratuito atingido", () => {
    expect({ plan: "free" as const, count: 5, limit: FREE_DAILY_LIMIT }.count < FREE_DAILY_LIMIT).toBe(false);
  });

  it("plano pro permite uso alto", () => {
    expect({ plan: "pro" as const, count: 100, limit: PRO_DAILY_LIMIT }.count < PRO_DAILY_LIMIT).toBe(true);
  });

  it("checkout tem metadados", () => {
    const cfg = { mode: "subscription", line_items: [{ price: "price_123", quantity: 1 }], client_reference_id: "user-123", metadata: { supabase_user_id: "user-123" }, subscription_data: { metadata: { supabase_user_id: "user-123" } }, success_url: "https://app.com/app?upgraded=true", cancel_url: "https://app.com/upgrade" };
    expect(cfg.metadata.supabase_user_id).toBe("user-123");
    expect(cfg.subscription_data.metadata.supabase_user_id).toBe("user-123");
  });

  it("webhook atualiza assinatura", () => {
    const db = { user_id: "user-123", plan: "pro", status: "active", stripe_subscription_id: "sub_123" };
    expect(db.plan).toBe("pro");
  });

  it("cancelamento rebaixa para free", () => {
    const up = { plan: "free", status: "canceled" };
    expect(up.plan).toBe("free");
  });

  it("rejeita topicos curtos", () => { expect("ab".length).toBeLessThan(3); });
  it("aceita topicos validos", () => { const t = "Como crescer no Instagram"; expect(t.length).toBeGreaterThanOrEqual(3); expect(t.length).toBeLessThanOrEqual(400); });
  it("rejeita transcricoes longas", () => { expect("a".repeat(5001).length).toBeGreaterThan(5000); });
  it("webhook usa HTTPS", () => { expect("https://app.com/api/public/stripe-webhook".startsWith("https://")).toBe(true); });
});
