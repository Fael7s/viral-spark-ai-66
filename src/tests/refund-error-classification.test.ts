import { describe, it, expect } from "vitest";
import { isMissingFunctionError } from "@/lib/generate.functions";

// Cobre a classificacao de erro do estorno de geracao.
//
// refund_generation esta versionada em supabase/migrations mas ainda nao foi
// aplicada no banco. Enquanto isso, toda falha de geracao dispara uma RPC para
// uma funcao inexistente. Sem esta classificacao, cada falha gravaria um
// console.error de "funcao nao encontrada" exatamente no log que alguem esta
// lendo para diagnosticar a falha original.
//
// O que separa os dois casos: migration pendente e lacuna de deploy e vai para
// console.warn; qualquer outro erro de estorno e falha de runtime e continua em
// console.error.
describe("Deteccao de migration pendente no estorno", () => {
  it("reconhece o codigo do PostgREST para funcao ausente do schema cache", () => {
    expect(
      isMissingFunctionError({
        code: "PGRST202",
        message: "Could not find the function public.refund_generation in the schema cache",
      }),
    ).toBe(true);
  });

  it("reconhece o codigo do Postgres para funcao inexistente", () => {
    expect(
      isMissingFunctionError({
        code: "42883",
        message: "function public.refund_generation() does not exist",
      }),
    ).toBe(true);
  });

  it("reconhece pela mensagem quando o codigo nao vem", () => {
    expect(
      isMissingFunctionError({ message: "function public.refund_generation() does not exist" }),
    ).toBe(true);
    expect(
      isMissingFunctionError({ message: "Could not find the function public.refund_generation" }),
    ).toBe(true);
  });

  it("reconhece um Error nativo com a mesma mensagem", () => {
    expect(isMissingFunctionError(new Error("function refund_generation does not exist"))).toBe(
      true,
    );
  });

  it("nao confunde falha de runtime com migration pendente", () => {
    // Estes precisam continuar em console.error: sao problemas reais.
    expect(
      isMissingFunctionError({ code: "42501", message: "permission denied for function" }),
    ).toBe(false);
    expect(isMissingFunctionError({ code: "PGRST301", message: "JWT expired" })).toBe(false);
    expect(isMissingFunctionError(new Error("Failed to fetch"))).toBe(false);
    expect(isMissingFunctionError({ message: "Not authenticated" })).toBe(false);
  });

  it("nao quebra com entrada degenerada", () => {
    // O erro chega como unknown; a funcao nao pode lancar ao inspeciona-lo,
    // senao o proprio tratamento de erro vira uma falha.
    expect(() => isMissingFunctionError(null)).not.toThrow();
    expect(() => isMissingFunctionError(undefined)).not.toThrow();
    expect(() => isMissingFunctionError("string solta")).not.toThrow();
    expect(() => isMissingFunctionError(42)).not.toThrow();
    expect(() => isMissingFunctionError({})).not.toThrow();
    expect(isMissingFunctionError(null)).toBe(false);
    expect(isMissingFunctionError(undefined)).toBe(false);
    expect(isMissingFunctionError({})).toBe(false);
  });

  it("uma string solta com a frase ainda conta como migration pendente", () => {
    expect(isMissingFunctionError("function does not exist")).toBe(true);
  });
});
