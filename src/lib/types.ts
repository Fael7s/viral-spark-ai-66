export type Platform = "tiktok" | "reels" | "shorts";
export type Tone =
  | "engracado"
  | "motivacional"
  | "educativo"
  | "storytelling"
  | "provocativo"
  | "luxo";

export interface GenerationResult {
  hooks: string[];
  captions: string[];
  emojis: string[];
  hashtags: string[];
}

export interface GenerationRecord extends GenerationResult {
  id: string;
  platform: Platform;
  tone: Tone;
  input_topic: string;
  input_transcript: string | null;
  created_at: string;
}

export const PLATFORMS: { value: Platform; label: string; hint: string }[] = [
  { value: "tiktok", label: "TikTok", hint: "Direto, gírio e ritmado" },
  { value: "reels", label: "Instagram Reels", hint: "Estético e visual" },
  { value: "shorts", label: "YouTube Shorts", hint: "Informativo e claro" },
];

export const TONES: { value: Tone; label: string; pro?: boolean }[] = [
  { value: "engracado", label: "Engraçado" },
  { value: "motivacional", label: "Motivacional" },
  { value: "educativo", label: "Educativo" },
  { value: "storytelling", label: "Storytelling" },
  { value: "provocativo", label: "Provocativo", pro: true },
  { value: "luxo", label: "Luxo / Aspiracional", pro: true },
];

/**
 * Tons exclusivos do plano Pro. Derivado de TONES para que a lista nunca
 * divirja da marcacao usada na interface. A interface esconde estes tons de
 * contas Free, mas o endpoint de geracao e chamavel diretamente, entao a
 * validacao que vale e a do servidor, em generate.functions.ts.
 */
export const PRO_ONLY_TONES: Tone[] = TONES.filter((t) => t.pro).map((t) => t.value);

export function isProOnlyTone(tone: Tone): boolean {
  return PRO_ONLY_TONES.includes(tone);
}

/**
 * Portao de plano para tons Pro. Lanca TONE_REQUIRES_PRO quando uma conta
 * fora do plano Pro pede um tom exclusivo. Plano ausente ou desconhecido
 * conta como Free, para que a falta de dado nunca libere acesso.
 */
export function assertTonePermitted(tone: Tone, plan: string | null | undefined): void {
  if (isProOnlyTone(tone) && (plan ?? "free") !== "pro") {
    throw new Error("TONE_REQUIRES_PRO");
  }
}

export const FREE_DAILY_LIMIT = 5;
export const PRO_DAILY_LIMIT = 500; // high soft cap to protect against abuse
