import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchUsage, toggleFavorite, fetchHistory, fetchFavorites } from "@/lib/db";
import { FREE_DAILY_LIMIT, PRO_DAILY_LIMIT } from "@/lib/types";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));
import { supabase } from "@/integrations/supabase/client";

describe("Banco de Dados", () => {
  const mockFrom = vi.fn();
  beforeEach(() => { vi.resetAllMocks(); (supabase as any).from = mockFrom; });

  it("plano free sem assinatura", async () => {
    mockFrom.mockReturnValue({ select: vi.fn(() => ({ maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })) })) });
    const u = await fetchUsage();
    expect(u.plan).toBe("free"); expect(u.limit).toBe(FREE_DAILY_LIMIT);
  });

  it("plano pro ativo", async () => {
    mockFrom.mockReturnValue({ select: vi.fn(() => ({ maybeSingle: vi.fn(() => Promise.resolve({ data: { plan: "pro" }, error: null })) })) });
    const u = await fetchUsage();
    expect(u.plan).toBe("pro"); expect(u.limit).toBe(PRO_DAILY_LIMIT);
  });

  it("reseta contagem quando data diferente", async () => {
    const ontem = new Date(); ontem.setDate(ontem.getDate()-1);
    mockFrom.mockReturnValue({ select: vi.fn(() => ({ maybeSingle: vi.fn(() => Promise.resolve({ data: { plan: "free", daily_count: 5, reset_date: ontem.toISOString().slice(0,10) }, error: null })) })) });
    const u = await fetchUsage(); expect(u.count).toBe(0);
  });

  it("insere favorito", async () => {
    const ins = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ insert: ins });
    await toggleFavorite("u", "g", true);
    expect(mockFrom).toHaveBeenCalledWith("favorites");
    expect(ins).toHaveBeenCalledWith({ user_id: "u", generation_id: "g" });
  });

  it("deleta favorito", async () => {
    const eq2 = vi.fn(() => Promise.resolve({ error: null }));
    const eq1 = vi.fn(() => ({ eq: eq2 }));
    mockFrom.mockReturnValue({ delete: vi.fn(() => ({ eq: eq1 })) });
    await toggleFavorite("u", "g", false);
    expect(mockFrom).toHaveBeenCalledWith("favorites");
  });

  it("ignora duplicata 23505", async () => {
    mockFrom.mockReturnValue({ insert: vi.fn(() => Promise.resolve({ error: { code: "23505" } })) });
    await expect(toggleFavorite("u", "g", true)).resolves.not.toThrow();
  });

  it("historico ordenado", async () => {
    const data = [
      { id: "g1", platform: "tiktok", tone: "engracado", input_topic: "T1", input_transcript: null, result_hooks: ["H"], result_captions: ["C"], result_emojis: ["🔥"], result_hashtags: ["#t"], created_at: "2024-01-02T00:00:00Z" },
      { id: "g2", platform: "reels", tone: "luxo", input_topic: "T2", input_transcript: null, result_hooks: ["H"], result_captions: ["C"], result_emojis: ["✨"], result_hashtags: ["#t"], created_at: "2024-01-01T00:00:00Z" },
    ];
    mockFrom.mockReturnValue({ select: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve({ data, error: null })) })) })) });
    const h = await fetchHistory();
    expect(h[0].id).toBe("g1"); expect(h[1].id).toBe("g2");
  });

  it("favoritos filtram geracoes deletadas", async () => {
    mockFrom.mockReturnValue({ select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [{ generations: { id: "g1", platform: "tiktok", tone: "engracado", input_topic: "T", input_transcript: null, result_hooks: ["H"], result_captions: ["C"], result_emojis: ["🔥"], result_hashtags: ["#t"], created_at: "2024-01-01T00:00:00Z" } }, { generations: null }], error: null })) })) });
    const f = await fetchFavorites();
    expect(f).toHaveLength(1); expect(f[0].id).toBe("g1");
  });
});
