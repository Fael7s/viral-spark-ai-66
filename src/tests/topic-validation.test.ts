import { describe, it, expect } from "vitest";
import {
  inputSchema,
  TOPIC_MIN_LENGTH,
  TOPIC_MAX_LENGTH,
  TRANSCRIPT_MAX_LENGTH,
} from "@/lib/generate.functions";
import { ERROR_MESSAGES } from "@/lib/generate.server";

// Cobre a validacao de entrada de generateContent. O schema exercitado aqui e
// o mesmo objeto que o inputValidator do handler usa, nao uma reimplementacao.
//
// A regressao que estes testes existem para impedir: .max() sem mensagem
// propria fazia o zod emitir o texto padrao em ingles, que nao casa com
// nenhuma chave de ERROR_MESSAGES e caia no fallback generico da interface --
// o mesmo texto de AI_ERROR. Falha de validacao e falha de IA ficavam
// indistinguiveis na tela. Por isso as mensagens agora sao codigos, e por isso
// o ultimo bloco garante que todo codigo emitido tem traducao.

function codesFor(input: unknown): string[] {
  const parsed = inputSchema.safeParse(input);
  if (parsed.success) return [];
  return parsed.error.issues.map((i) => i.message);
}

const validBase = {
  platform: "tiktok" as const,
  tone: "engracado" as const,
  topic: "Como crescer no Instagram",
  transcript: "",
};

describe("Validacao do campo tema", () => {
  it("aceita uma entrada valida", () => {
    const parsed = inputSchema.safeParse(validBase);
    expect(parsed.success).toBe(true);
  });

  it("tema abaixo do minimo produz TOPIC_TOO_SHORT", () => {
    expect(codesFor({ ...validBase, topic: "ab" })).toContain("TOPIC_TOO_SHORT");
  });

  it("tema vazio produz TOPIC_TOO_SHORT", () => {
    expect(codesFor({ ...validBase, topic: "" })).toContain("TOPIC_TOO_SHORT");
  });

  it("tema so de espacos produz TOPIC_TOO_SHORT, porque o trim vem antes", () => {
    expect(codesFor({ ...validBase, topic: "     " })).toContain("TOPIC_TOO_SHORT");
  });

  it("tema acima do maximo produz TOPIC_TOO_LONG", () => {
    const tooLong = "a".repeat(TOPIC_MAX_LENGTH + 1);
    expect(codesFor({ ...validBase, topic: tooLong })).toContain("TOPIC_TOO_LONG");
  });

  it("os limites exatos sao aceitos, nao rejeitados", () => {
    expect(
      inputSchema.safeParse({ ...validBase, topic: "a".repeat(TOPIC_MIN_LENGTH) }).success,
    ).toBe(true);
    expect(
      inputSchema.safeParse({ ...validBase, topic: "a".repeat(TOPIC_MAX_LENGTH) }).success,
    ).toBe(true);
  });

  it("transcricao acima do maximo produz TRANSCRIPT_TOO_LONG", () => {
    const tooLong = "a".repeat(TRANSCRIPT_MAX_LENGTH + 1);
    expect(codesFor({ ...validBase, transcript: tooLong })).toContain("TRANSCRIPT_TOO_LONG");
  });

  it("transcricao no limite exato e aceita", () => {
    const atLimit = "a".repeat(TRANSCRIPT_MAX_LENGTH);
    expect(inputSchema.safeParse({ ...validBase, transcript: atLimit }).success).toBe(true);
  });

  it("transcricao e opcional e vira string vazia", () => {
    const parsed = inputSchema.safeParse({
      platform: "tiktok",
      tone: "engracado",
      topic: "Um tema qualquer",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.transcript).toBe("");
  });

  it("as constantes exportadas batem com o que o schema aplica", () => {
    // Se alguem mudar a constante sem mexer no schema, ou vice-versa, a UI
    // passa a mostrar um contador que nao corresponde ao que o servidor aceita.
    expect(TOPIC_MIN_LENGTH).toBe(3);
    expect(TOPIC_MAX_LENGTH).toBe(400);
    expect(TRANSCRIPT_MAX_LENGTH).toBe(5000);
    expect(
      inputSchema.safeParse({ ...validBase, topic: "a".repeat(TOPIC_MIN_LENGTH - 1) }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({ ...validBase, topic: "a".repeat(TOPIC_MAX_LENGTH + 1) }).success,
    ).toBe(false);
  });
});

describe("Codigos de validacao tem traducao na interface", () => {
  // Este e o bloco que impede a regressao original: um codigo emitido pelo
  // schema sem chave correspondente cai no texto generico e o usuario nunca
  // fica sabendo o que fez de errado.
  for (const code of ["TOPIC_TOO_SHORT", "TOPIC_TOO_LONG", "TRANSCRIPT_TOO_LONG"]) {
    it(`${code} existe em ERROR_MESSAGES`, () => {
      expect(ERROR_MESSAGES[code]).toBeTruthy();
      expect(typeof ERROR_MESSAGES[code]).toBe("string");
    });

    it(`${code} nao repete o texto generico de AI_ERROR`, () => {
      expect(ERROR_MESSAGES[code]).not.toBe(ERROR_MESSAGES.AI_ERROR);
    });
  }

  it("todo codigo que o schema emite tem chave em ERROR_MESSAGES", () => {
    // Varre as violacoes reais do schema em vez de confiar numa lista escrita
    // a mao, para que um codigo novo sem traducao seja pego aqui.
    const emitted = new Set<string>([
      ...codesFor({ ...validBase, topic: "" }),
      ...codesFor({ ...validBase, topic: "a".repeat(TOPIC_MAX_LENGTH + 1) }),
      ...codesFor({ ...validBase, transcript: "a".repeat(TRANSCRIPT_MAX_LENGTH + 1) }),
    ]);
    expect(emitted.size).toBeGreaterThan(0);
    for (const code of emitted) {
      expect(ERROR_MESSAGES[code], `codigo sem traducao: ${code}`).toBeTruthy();
    }
  });

  it("a interface resolve o codigo pela mesma busca por substring que usa em producao", () => {
    // app.tsx faz Object.keys(ERROR_MESSAGES).find((k) => msg.includes(k)).
    // O erro do zod chega serializado, entao o codigo precisa aparecer nele.
    const parsed = inputSchema.safeParse({ ...validBase, topic: "ab" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const msg = parsed.error.message;
    const key = Object.keys(ERROR_MESSAGES).find((k) => msg.includes(k));
    expect(key).toBe("TOPIC_TOO_SHORT");
  });
});
