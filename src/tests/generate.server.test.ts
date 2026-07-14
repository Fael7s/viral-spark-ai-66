import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildMessages, callAiGateway, resultSchema, ERROR_MESSAGES } from "@/lib/generate.server";
import type { Platform, Tone } from "@/lib/types";

describe("Geracao de Conteudo", () => {
  beforeEach(() => { vi.resetAllMocks(); delete process.env.LOVABLE_API_KEY; });

  it("valida schema de resultado", () => {
    const r = resultSchema.parse({ hooks: ["H1","H2","H3"], captions: ["C1","C2","C3"], emojis: ["🔥","✨","💡","🚀"], hashtags: ["#a","#b","#c"] });
    expect(r.hooks).toHaveLength(3);
  });

  it("rejeita poucos hooks", () => {
    expect(() => resultSchema.parse({ hooks: ["H1"], captions: ["C1","C2","C3"], emojis: ["🔥","✨","💡","🚀"], hashtags: ["#a","#b","#c"] })).toThrow();
  });

  it("rejeita hashtags em excesso", () => {
    expect(() => resultSchema.parse({ hooks: ["H1","H2","H3"], captions: ["C1","C2","C3"], emojis: ["🔥","✨","💡","🚀"], hashtags: Array(9).fill("#t") })).toThrow();
  });

  it("prompt contem regras do TikTok", () => {
    const m = buildMessages({ platform: "tiktok" as Platform, tone: "engracado" as Tone, topic: "Fotografia" });
    expect(m[0].content).toContain("TikTok");
    expect(m[0].content).toContain("Humor, leveza");
    expect(m[1].content).toContain("<input_usuario>");
  });

  it("prompt contem regras do Reels", () => {
    const m = buildMessages({ platform: "reels" as Platform, tone: "luxo" as Tone, topic: "Maldivas" });
    expect(m[0].content).toContain("Instagram Reels");
    expect(m[0].content).toContain("Sofisticado");
  });

  it("inclui transcricao quando fornecida", () => {
    const m = buildMessages({ platform: "shorts" as Platform, tone: "educativo" as Tone, topic: "Investir", transcript: "Abra a corretora" });
    expect(m[1].content).toContain("TRANSCRICAO/ROTEIRO: Abra a corretora");
  });

  it("indica transcricao nao fornecida", () => {
    const m = buildMessages({ platform: "shorts" as Platform, tone: "educativo" as Tone, topic: "Investir" });
    expect(m[1].content).toContain("(não fornecida)");
  });

  it("gera campo unico com only", () => {
    const m = buildMessages({ platform: "tiktok" as Platform, tone: "motivacional" as Tone, topic: "Superacao", only: "hooks" });
    expect(m[0].content).toContain("Gere APENAS o campo 'hooks'");
  });

  it("lanca AI_KEY_MISSING sem env", async () => {
    await expect(callAiGateway([])).rejects.toThrow("AI_KEY_MISSING");
  });

  it("retorna resultado em sucesso", async () => {
    process.env.LOVABLE_API_KEY = "k";
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify({ hooks: ["H1","H2","H3"], captions: ["C1","C2","C3"], emojis: ["🔥","✨","💡","🚀"], hashtags: ["a","b","c"] }) } }] } }] }) } as Response);
    const r = await callAiGateway([]);
    expect(r.hashtags.every(h => h.startsWith("#"))).toBe(true);
  });

  it("normaliza hashtags com excesso de #", async () => {
    process.env.LOVABLE_API_KEY = "k";
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify({ hooks: ["H1","H2","H3"], captions: ["C1","C2","C3"], emojis: ["🔥","✨","💡","🚀"], hashtags: ["a","#b","##c","###d"] }) } }] } }] }) } as Response);
    const r = await callAiGateway([]);
    expect(r.hashtags).toEqual(["#a","#b","#c","#d"]);
  });

  it("lanca AI_RATE_LIMIT em 429", async () => {
    process.env.LOVABLE_API_KEY = "k";
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 429, json: () => Promise.resolve({}) } as Response);
    await expect(callAiGateway([])).rejects.toThrow("AI_RATE_LIMIT");
  });

  it("lanca AI_CREDITS em 402", async () => {
    process.env.LOVABLE_API_KEY = "k";
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 402, json: () => Promise.resolve({}) } as Response);
    await expect(callAiGateway([])).rejects.toThrow("AI_CREDITS");
  });

  it("lanca AI_BAD_OUTPUT sem tool_call", async () => {
    process.env.LOVABLE_API_KEY = "k";
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ choices: [{ message: {} }] }) } as Response);
    await expect(callAiGateway([])).rejects.toThrow("AI_BAD_OUTPUT");
  });

  it("lanca AI_BAD_OUTPUT com JSON invalido", async () => {
    process.env.LOVABLE_API_KEY = "k";
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ choices: [{ message: { tool_calls: [{ function: { arguments: "not-json" } }] } }] }) } as Response);
    await expect(callAiGateway([])).rejects.toThrow("AI_BAD_OUTPUT");
  });

  it("tem mensagens para todos os erros", () => {
    ["AI_RATE_LIMIT","AI_CREDITS","AI_ERROR","AI_BAD_OUTPUT","AI_KEY_MISSING","LIMIT_REACHED","BILLING_CONFIG_ERROR"].forEach(c => {
      expect(ERROR_MESSAGES[c]).toBeDefined();
    });
  });

  it("LIMIT_REACHED sugere upgrade", () => {
    expect(ERROR_MESSAGES["LIMIT_REACHED"]).toContain("limite diário");
  });
});
