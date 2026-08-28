import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { buildMessages, callAiGateway, ERROR_MESSAGES } from "./generate.server";
import { TOPIC_MIN_LENGTH } from "./generate.functions";

export const DEMO_TOPIC_MAX_LENGTH = 300;
export const DEMO_DAILY_LIMIT_PER_IP = 3;

export const DEMO_ERROR_MESSAGES: Record<string, string> = {
  ...ERROR_MESSAGES,
  DEMO_TOPIC_TOO_LONG: "O texto passou de 300 caracteres. Encurta a descrição.",
  DEMO_LIMIT_REACHED: "Limite de demonstração atingido. Crie sua conta grátis para continuar.",
};

const demoInputSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(TOPIC_MIN_LENGTH, "TOPIC_TOO_SHORT")
    .max(DEMO_TOPIC_MAX_LENGTH, "DEMO_TOPIC_TOO_LONG"),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function hashIp(ip: string): string {
  const salt = process.env.DEMO_IP_HASH_SALT ?? "viral-caption-demo";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Server function pública e separada de generateContent (lib/generate.functions.ts):
 * sem middleware de auth, sem escrita em public.generations, sem tocar em
 * usage_limits/subscriptions. Tem sua própria tabela de rate limit
 * (public.demo_generation_limits), aplicada no servidor via RPC antes de
 * qualquer chamada ao modelo de IA.
 */
export const generateDemoContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const parsed = demoInputSchema.safeParse(data);
    if (!parsed.success) {
      console.error("[generate-demo] input validation failed", {
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.code, message: i.message })),
      });
      throw parsed.error;
    }
    return parsed.data;
  })
  .handler(async ({ data }) => {
    const request = getRequest();
    const ip = getClientIp(request);
    const ipHash = hashIp(ip);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    };

    const { data: consumed, error: consumeError } = await admin.rpc("consume_demo_generation", {
      _ip_hash: ipHash,
      _daily_limit: DEMO_DAILY_LIMIT_PER_IP,
    });
    if (consumeError) {
      console.error("[generate-demo] consume_demo_generation error", consumeError);
      throw new Error("AI_ERROR");
    }
    const usage = consumed as { allowed: boolean };
    if (!usage.allowed) {
      throw new Error("DEMO_LIMIT_REACHED");
    }

    try {
      const messages = buildMessages({
        platform: "tiktok",
        tone: "motivacional",
        topic: data.topic,
        transcript: undefined,
      });
      return await callAiGateway(messages);
    } catch (err) {
      try {
        await admin.rpc("refund_demo_generation", { _ip_hash: ipHash });
      } catch (refundErr) {
        console.error("[generate-demo] refund_demo_generation failed", refundErr);
      }
      throw err;
    }
  });
