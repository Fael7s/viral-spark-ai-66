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

export const FREE_DAILY_LIMIT = 5;
export const PRO_DAILY_LIMIT = 500; // high soft cap to protect against abuse
