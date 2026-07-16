import { supabase } from "@/integrations/supabase/client";
import type { GenerationRecord, GenerationResult, Platform, Tone } from "./types";
import { FREE_DAILY_LIMIT, PRO_DAILY_LIMIT } from "./types";

// The generated Database types are empty until tables are introspected; cast to a
// permissive client so the app compiles while RLS enforces per-user access.
const db = supabase as unknown as {
  from: (t: string) => any;
};

interface GenerationRow {
  id: string;
  platform: Platform;
  tone: Tone;
  input_topic: string;
  input_transcript: string | null;
  result_hooks: string[];
  result_captions: string[];
  result_emojis: string[];
  result_hashtags: string[];
  created_at: string;
}

function toRecord(r: GenerationRow): GenerationRecord {
  return {
    id: r.id,
    platform: r.platform,
    tone: r.tone,
    input_topic: r.input_topic,
    input_transcript: r.input_transcript,
    created_at: r.created_at,
    hooks: r.result_hooks ?? [],
    captions: r.result_captions ?? [],
    emojis: r.result_emojis ?? [],
    hashtags: r.result_hashtags ?? [],
  };
}

export async function fetchHistory(): Promise<GenerationRecord[]> {
  const { data, error } = await db
    .from("generations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as GenerationRow[]).map(toRecord);
}

export async function fetchFavorites(): Promise<GenerationRecord[]> {
  const { data, error } = await db
    .from("favorites")
    .select("generation_id, generations(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as { generations: GenerationRow }[])
    .filter((f) => f.generations)
    .map((f) => toRecord(f.generations));
}

export async function fetchFavoriteIds(): Promise<Set<string>> {
  const { data, error } = await db.from("favorites").select("generation_id");
  if (error) throw error;
  return new Set((data as { generation_id: string }[]).map((f) => f.generation_id));
}

export async function toggleFavorite(userId: string, generationId: string, on: boolean) {
  if (on) {
    const { error } = await db
      .from("favorites")
      .insert({ user_id: userId, generation_id: generationId });
    if (error && (error as { code?: string }).code !== "23505") throw error;
  } else {
    const { error } = await db
      .from("favorites")
      .delete()
      .eq("generation_id", generationId)
      .eq("user_id", userId);
    if (error) throw error;
  }
}

export interface UsageInfo {
  plan: "free" | "pro";
  count: number;
  limit: number;
  bonus: number;
}

export async function fetchUsage(): Promise<UsageInfo> {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: sub }, { data: usage }, { data: bonuses }] = await Promise.all([
    db.from("subscriptions").select("plan").maybeSingle(),
    db.from("usage_limits").select("daily_count, reset_date").maybeSingle(),
    db.from("referral_bonuses").select("bonus_generations").eq("granted_date", today),
  ]);
  const plan = (sub?.plan ?? "free") as "free" | "pro";
  const isToday = usage?.reset_date === today;
  const count = isToday ? (usage?.daily_count ?? 0) : 0;
  const base = plan === "pro" ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
  const bonus = ((bonuses ?? []) as { bonus_generations: number }[]).reduce(
    (s, r) => s + (r.bonus_generations ?? 0),
    0,
  );
  return { plan, count, limit: base + bonus, bonus };
}

export interface ReferralInfo {
  code: string | null;
  totalReferrals: number;
  totalBonus: number;
}

export async function fetchReferralInfo(): Promise<ReferralInfo> {
  const [{ data: profile }, { data: bonuses }] = await Promise.all([
    db.from("profiles").select("referral_code").maybeSingle(),
    db.from("referral_bonuses").select("bonus_generations"),
  ]);
  const rows = (bonuses ?? []) as { bonus_generations: number }[];
  return {
    code: (profile?.referral_code as string | null) ?? null,
    totalReferrals: rows.length,
    totalBonus: rows.reduce((s, r) => s + (r.bonus_generations ?? 0), 0),
  };
}

export type { GenerationResult };

