import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildMessages, callAiGateway } from "./generate.server";
import { FREE_DAILY_LIMIT, PRO_DAILY_LIMIT } from "./types";

const inputSchema = z.object({
  platform: z.enum(["tiktok", "reels", "shorts"]),
  tone: z.enum(["engracado", "motivacional", "educativo", "storytelling", "provocativo", "luxo"]),
  topic: z.string().trim().min(3, "Descreva o tema com pelo menos 3 caracteres").max(400),
  transcript: z.string().trim().max(5000).optional().default(""),
});

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => {
          select: (c: string) => { single: () => Promise<{ data: unknown; error: unknown }> };
        };
      };
    };

    // Atomic daily-limit check + consume (race-safe in Postgres).
    const { data: consume, error: consumeError } = await supabase.rpc("consume_generation", {
      _free_limit: FREE_DAILY_LIMIT,
      _pro_limit: PRO_DAILY_LIMIT,
    });
    if (consumeError) {
      console.error("[generate] consume_generation error", consumeError);
      throw new Error("AI_ERROR");
    }
    const usage = consume as { allowed: boolean; count: number; limit: number; plan: string };
    if (!usage.allowed) {
      const err = new Error("LIMIT_REACHED") as Error & { code: string; usage: typeof usage };
      err.code = "LIMIT_REACHED";
      err.usage = usage;
      throw err;
    }

    const messages = buildMessages({
      platform: data.platform,
      tone: data.tone,
      topic: data.topic,
      transcript: data.transcript || undefined,
    });

    const result = await callAiGateway(messages);

    const { data: row, error: insertError } = await supabase
      .from("generations")
      .insert({
        user_id: context.userId,
        platform: data.platform,
        tone: data.tone,
        input_topic: data.topic,
        input_transcript: data.transcript || null,
        result_hooks: result.hooks,
        result_captions: result.captions,
        result_emojis: result.emojis,
        result_hashtags: result.hashtags,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("[generate] insert error", insertError);
    }

    const saved = (row ?? {}) as { id?: string; created_at?: string };
    return {
      id: saved.id ?? crypto.randomUUID(),
      created_at: saved.created_at ?? new Date().toISOString(),
      ...result,
      usage,
    };
  });
