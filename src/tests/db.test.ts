import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchUsage,
  toggleFavorite,
  fetchHistory,
  fetchFavorites,
  HISTORY_PAGE_SIZE,
} from "@/lib/db";
import { FREE_DAILY_LIMIT, PRO_DAILY_LIMIT } from "@/lib/types";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));
import { supabase } from "@/integrations/supabase/client";

describe("Banco de Dados", () => {
  const mockFrom = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    (supabase as any).from = mockFrom;
  });

  // fetchUsage dispara tres consultas em paralelo: subscriptions e usage_limits
  // terminam em .maybeSingle(), enquanto referral_bonuses encadeia
  // .eq("granted_date", hoje) e devolve uma lista. O double expoe as duas
  // terminacoes na mesma cadeia. Sem bonus, o limite fica igual ao limite base
  // do plano, que e o que estes testes sempre pretenderam verificar.
  const usageDouble = (data: unknown, bonuses: unknown[] = []) => ({
    select: vi.fn(() => ({
      maybeSingle: vi.fn(() => Promise.resolve({ data, error: null })),
      eq: vi.fn(() => Promise.resolve({ data: bonuses, error: null })),
    })),
  });

  it("plano free sem assinatura", async () => {
    mockFrom.mockReturnValue(usageDouble(null));
    const u = await fetchUsage();
    expect(u.plan).toBe("free");
    expect(u.limit).toBe(FREE_DAILY_LIMIT);
  });

  it("plano pro ativo", async () => {
    mockFrom.mockReturnValue(usageDouble({ plan: "pro" }));
    const u = await fetchUsage();
    expect(u.plan).toBe("pro");
    expect(u.limit).toBe(PRO_DAILY_LIMIT);
  });

  it("reseta contagem quando data diferente", async () => {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    mockFrom.mockReturnValue(
      usageDouble({
        plan: "free",
        daily_count: 5,
        reset_date: ontem.toISOString().slice(0, 10),
      }),
    );
    const u = await fetchUsage();
    expect(u.count).toBe(0);
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
    mockFrom.mockReturnValue({
      insert: vi.fn(() => Promise.resolve({ error: { code: "23505" } })),
    });
    await expect(toggleFavorite("u", "g", true)).resolves.not.toThrow();
  });

  it("historico ordenado com desempate estavel", async () => {
    const data = [
      {
        id: "g1",
        platform: "tiktok",
        tone: "engracado",
        input_topic: "T1",
        input_transcript: null,
        result_hooks: ["H"],
        result_captions: ["C"],
        result_emojis: ["🔥"],
        result_hashtags: ["#t"],
        created_at: "2024-01-02T00:00:00Z",
      },
      {
        id: "g2",
        platform: "reels",
        tone: "luxo",
        input_topic: "T2",
        input_transcript: null,
        result_hooks: ["H"],
        result_captions: ["C"],
        result_emojis: ["✨"],
        result_hashtags: ["#t"],
        created_at: "2024-01-01T00:00:00Z",
      },
    ];
    const limit = vi.fn(() => Promise.resolve({ data, error: null }));
    const order2 = vi.fn(() => ({ limit }));
    const order1 = vi.fn(() => ({ order: order2 }));
    mockFrom.mockReturnValue({ select: vi.fn(() => ({ order: order1 })) });
    const h = await fetchHistory();
    expect(order1).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(order2).toHaveBeenCalledWith("id", { ascending: false });
    expect(h.items[0].id).toBe("g1");
    expect(h.items[1].id).toBe("g2");
    expect(h.nextCursor).toBeNull();
  });

  it("keyset: aplica cursor e devolve proximo cursor quando pagina cheia", async () => {
    const data = Array.from({ length: HISTORY_PAGE_SIZE }, (_, i) => ({
      id: `g${i}`,
      platform: "tiktok",
      tone: "engracado",
      input_topic: `T${i}`,
      input_transcript: null,
      result_hooks: ["H"],
      result_captions: ["C"],
      result_emojis: ["🔥"],
      result_hashtags: ["#t"],
      created_at: "2024-01-01T00:00:00Z",
    }));
    const or = vi.fn(() => Promise.resolve({ data, error: null }));
    const limit = vi.fn(() => ({ or }));
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({ order: vi.fn(() => ({ order: vi.fn(() => ({ limit })) })) })),
    });
    const h = await fetchHistory({ created_at: "2024-01-05T00:00:00Z", id: "gx" });
    expect(or).toHaveBeenCalledWith(
      "created_at.lt.2024-01-05T00:00:00Z,and(created_at.eq.2024-01-05T00:00:00Z,id.lt.gx)",
    );
    expect(h.nextCursor).toEqual({
      created_at: "2024-01-01T00:00:00Z",
      id: `g${HISTORY_PAGE_SIZE - 1}`,
    });
  });

  it("favoritos filtram geracoes deletadas", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({
            data: [
              {
                generations: {
                  id: "g1",
                  platform: "tiktok",
                  tone: "engracado",
                  input_topic: "T",
                  input_transcript: null,
                  result_hooks: ["H"],
                  result_captions: ["C"],
                  result_emojis: ["🔥"],
                  result_hashtags: ["#t"],
                  created_at: "2024-01-01T00:00:00Z",
                },
              },
              { generations: null },
            ],
            error: null,
          }),
        ),
      })),
    });
    const f = await fetchFavorites();
    expect(f).toHaveLength(1);
    expect(f[0].id).toBe("g1");
  });
});
