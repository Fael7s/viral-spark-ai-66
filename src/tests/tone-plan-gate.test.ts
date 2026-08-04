import { describe, it, expect } from "vitest";
import { assertTonePermitted, isProOnlyTone, PRO_ONLY_TONES, TONES } from "@/lib/types";
import { ERROR_MESSAGES } from "@/lib/generate.server";
import type { Tone } from "@/lib/types";

// Cobre o portao de plano usado por generateContent em
// src/lib/generate.functions.ts. A interface esconde os tons Pro de contas
// Free, mas o endpoint e chamavel diretamente, entao a recusa precisa
// acontecer no servidor. Estes testes exercitam a mesma funcao que o handler
// chama, nao uma reimplementacao dela.
describe("Portao de plano para tons Pro", () => {
  const freeTones: Tone[] = TONES.filter((t) => !t.pro).map((t) => t.value);

  it("PRO_ONLY_TONES acompanha a marcacao de TONES", () => {
    expect(PRO_ONLY_TONES).toEqual(["provocativo", "luxo"]);
    expect(isProOnlyTone("provocativo")).toBe(true);
    expect(isProOnlyTone("luxo")).toBe(true);
    expect(isProOnlyTone("engracado")).toBe(false);
  });

  for (const tone of ["provocativo", "luxo"] as Tone[]) {
    it(`conta free e recusada no tom ${tone}`, () => {
      expect(() => assertTonePermitted(tone, "free")).toThrow("TONE_REQUIRES_PRO");
    });

    it(`conta pro e aceita no tom ${tone}`, () => {
      expect(() => assertTonePermitted(tone, "pro")).not.toThrow();
    });

    it(`plano ausente e tratado como free no tom ${tone}`, () => {
      // Sem assinatura ainda, ou leitura que voltou vazia: nunca liberar.
      expect(() => assertTonePermitted(tone, null)).toThrow("TONE_REQUIRES_PRO");
      expect(() => assertTonePermitted(tone, undefined)).toThrow("TONE_REQUIRES_PRO");
    });

    it(`status de plano desconhecido nao libera o tom ${tone}`, () => {
      expect(() => assertTonePermitted(tone, "trialing")).toThrow("TONE_REQUIRES_PRO");
      expect(() => assertTonePermitted(tone, "PRO")).toThrow("TONE_REQUIRES_PRO");
    });
  }

  for (const tone of freeTones) {
    it(`tom gratuito ${tone} e liberado em qualquer plano`, () => {
      expect(() => assertTonePermitted(tone, "free")).not.toThrow();
      expect(() => assertTonePermitted(tone, "pro")).not.toThrow();
      expect(() => assertTonePermitted(tone, null)).not.toThrow();
    });
  }

  it("a recusa tem mensagem propria para a interface", () => {
    expect(ERROR_MESSAGES.TONE_REQUIRES_PRO).toBeTruthy();
    expect(ERROR_MESSAGES.TONE_REQUIRES_PRO).toContain("Pro");
  });
});
