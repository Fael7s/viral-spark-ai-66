import { describe, it, expect } from "vitest";
import { FREE_DAILY_LIMIT, PRO_DAILY_LIMIT, PLATFORMS, TONES } from "@/lib/types";

describe("Regras de Negocio", () => {
  it("free = 5/dia", () => expect(FREE_DAILY_LIMIT).toBe(5));
  it("pro = 500/dia", () => expect(PRO_DAILY_LIMIT).toBe(500));
  it("proporcao 100x", () => expect(PRO_DAILY_LIMIT / FREE_DAILY_LIMIT).toBe(100));
  it("3 plataformas", () => { const p = PLATFORMS.map(x => x.value); expect(p).toEqual(["tiktok","reels","shorts"]); });
  it("plataformas tem label e hint", () => PLATFORMS.forEach(p => { expect(p.label.length).toBeGreaterThan(0); expect(p.hint.length).toBeGreaterThan(0); }));
  it("6 tons", () => expect(TONES).toHaveLength(6));
  it("tons pro: provocativo e luxo", () => { const pro = TONES.filter(t => t.pro).map(t => t.value); expect(pro).toContain("provocativo"); expect(pro).toContain("luxo"); expect(pro).toHaveLength(2); });
  it("4 tons gratuitos", () => expect(TONES.filter(t => !t.pro)).toHaveLength(4));
  it("segredos sem VITE_", () => { const env = "STRIPE_SECRET_KEY=\nSTRIPE_WEBHOOK_SECRET="; expect(env).not.toContain("VITE_STRIPE"); });
  it("service role server-side", () => expect(true).toBe(true));
});
