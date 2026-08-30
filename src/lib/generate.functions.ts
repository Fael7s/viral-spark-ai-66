import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildMessages, callAiGateway } from "./generate.server";
import { FREE_DAILY_LIMIT, PRO_DAILY_LIMIT, isProOnlyTone, assertTonePermitted } from "./types";

/**
 * True when the refund failed only because refund_generation is not in the
 * database yet. PostgREST answers PGRST202 ("Could not find the function
 * public.refund_generation in the schema cache"); a direct Postgres error
 * would be 42883.
 */
export function isMissingFunctionError(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown };
  if (e?.code === "PGRST202" || e?.code === "42883") return true;
  const message = typeof e?.message === "string" ? e.message : String(err ?? "");
  return message.includes("Could not find the function") || message.includes("does not exist");
}

/**
 * A pending migration is a deployment gap, not a runtime fault, and it would
 * otherwise write one console.error per failed generation into exactly the log
 * someone is reading to diagnose that failure. Keep it at warn level and say
 * what it actually is.
 */
function reportRefundFailure(err: unknown): void {
  if (isMissingFunctionError(err)) {
    console.warn(
      "[generate] refund skipped: refund_generation is not in the database yet. " +
        "Pending migration, not a runtime failure. See supabase/migrations/README.md.",
      err,
    );
    return;
  }
  console.error("[generate] refund failed", err);
}

/**
 * Gives back the daily generation that consume_generation already debited,
 * for a request that ends up delivering nothing.
 *
 * Swallows its own failure on purpose. This must never replace the error that
 * caused the refund: the caller rethrows that one, and a refund problem that
 * masked it would make the original failure harder to diagnose, not easier.
 *
 * Note that supabase-js reports RPC problems in `error` rather than throwing,
 * so the returned error is checked as well as the surrounding try/catch. That
 * also covers the window where this code is deployed before the migration
 * that creates refund_generation has been applied.
 */
async function refundGeneration(supabase: {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}): Promise<void> {
  try {
    const { error } = await supabase.rpc("refund_generation", {});
    if (error) {
      reportRefundFailure(error);
    }
  } catch (refundErr) {
    reportRefundFailure(refundErr);
  }
}

export const TOPIC_MIN_LENGTH = 3;
export const TOPIC_MAX_LENGTH = 400;
export const TRANSCRIPT_MAX_LENGTH = 5000;

export const inputSchema = z.object({
  platform: z.enum(["tiktok", "reels", "shorts"]),
  tone: z.enum(["engracado", "motivacional", "educativo", "storytelling", "provocativo", "luxo"]),
  // The messages are codes because the UI resolves the text through
  // ERROR_MESSAGES. zod's default message ("String must contain at most 400
  // character(s)") matches no key and fell through to the generic fallback,
  // which happens to be the same text as AI_ERROR, making a validation
  // failure and an AI failure indistinguishable on screen.
  topic: z
    .string()
    .trim()
    .min(TOPIC_MIN_LENGTH, "TOPIC_TOO_SHORT")
    .max(TOPIC_MAX_LENGTH, "TOPIC_TOO_LONG"),
  transcript: z
    .string()
    .trim()
    .max(TRANSCRIPT_MAX_LENGTH, "TRANSCRIPT_TOO_LONG")
    .optional()
    .default(""),
});

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const parsed = inputSchema.safeParse(data);
    if (!parsed.success) {
      // Field, code and message only. Never the content the user submitted.
      console.error("[generate] input validation failed", {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          code: i.code,
          message: i.message,
        })),
      });
      // Rethrow the zod error so the UI behaves exactly as before.
      throw parsed.error;
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>;
      from: (table: string) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
        };
      };
    };

    // Pro-only tones are hidden in the UI for Free accounts, but this endpoint
    // is callable directly, so the plan has to be enforced here. Checked before
    // consume_generation so a rejected request does not burn a daily generation.
    // Same source of truth as fetchUsage: subscriptions.plan, read through the
    // caller's own client, which RLS scopes to their own row.
    if (isProOnlyTone(data.tone)) {
      const { data: sub, error: planError } = await supabase
        .from("subscriptions")
        .select("plan")
        .maybeSingle();
      if (planError) {
        console.error("[generate] plan lookup failed", planError);
        throw new Error("AI_ERROR");
      }
      assertTonePermitted(data.tone, (sub as { plan?: string } | null)?.plan);
    }

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

    // The generation is debited from here on. Every failure between this point
    // and a delivered result has to give it back, otherwise the user pays for
    // an outage of ours. The debit itself is deliberately not moved after the
    // AI call: it has to stay atomic, and debiting later would let two
    // concurrent requests both read the counter below the limit and pass.
    //
    // This covers RATE_LIMIT and every error callAiGateway can raise
    // (AI_KEY_MISSING, AI_TIMEOUT, AI_RATE_LIMIT, AI_CREDITS, AI_ERROR,
    // AI_BAD_OUTPUT from a missing tool call, invalid JSON or a failed zod
    // schema check, plus any raw network error), without enumerating them.
    let result: Awaited<ReturnType<typeof callAiGateway>>;
    try {
      // Per-minute rate limit (30/min for Pro, 5/min for Free) using service role.
      {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<{ data: unknown; error: unknown }>;
        };
        const { data: allowed, error: rateError } = await admin.rpc("check_rate_limit", {
          _user_id: context.userId,
          _window_seconds: 60,
          _max_requests: usage.plan === "pro" ? 30 : 5,
        });
        if (rateError) {
          console.error("[generate] check_rate_limit error", rateError);
        } else if (allowed === false) {
          throw new Error("RATE_LIMIT");
        }
      }

      const messages = buildMessages({
        platform: data.platform,
        tone: data.tone,
        topic: data.topic,
        transcript: data.transcript || undefined,
      });

      result = await callAiGateway(messages);
    } catch (err) {
      await refundGeneration(supabase);
      throw err;
    }

    // The user's authenticated client can no longer INSERT into generations
    // (RLS is SELECT-only). consume_generation() already validated the caller
    // via auth.uid(), so the final insert is done with the service role here.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // supabaseAdmin estreitado a superficie usada. O retorno de from() e a cadeia do PostgREST, cujo tipo exige os genericos completos de types.ts (gerado).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as unknown as { from: (t: string) => any };

    const { data: row, error: insertError } = await admin
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

    // id is null when the row was not persisted. It used to be a fresh
    // crypto.randomUUID(), which looked valid to the client and then failed
    // silently on favourite: the "Users insert own favorites" policy requires
    // generation_id to exist and belong to the caller. The result is still
    // delivered; the UI disables favouriting when id is null.
    const saved = (row ?? {}) as { id?: string; created_at?: string };
    return {
      id: saved.id ?? null,
      created_at: saved.created_at ?? new Date().toISOString(),
      ...result,
      usage,
    };
  });
