import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

function periodEndISO(sub: Stripe.Subscription): string | null {
  // Newer Stripe API exposes current_period_end on subscription items;
  // older responses keep it on the subscription itself.
  const fromSub = (sub as unknown as { current_period_end?: number }).current_period_end;
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  const ts = fromSub ?? fromItem;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

// Returns true only when this Stripe event is newer than the last one we
// processed for the subscription, protecting against out-of-order delivery.
async function isNewerEvent(
  db: { from: (t: string) => any },
  subscriptionId: string,
  eventCreatedUnix: number,
): Promise<boolean> {
  const { data, error } = await db
    .from("subscriptions")
    .select("last_stripe_event_created")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) {
    console.error("[stripe-webhook] ordering check failed", error);
    // Fall back to applying the update rather than silently dropping it.
    return true;
  }
  const last = (data as { last_stripe_event_created?: string | null } | null)
    ?.last_stripe_event_created;
  if (!last) return true;
  return eventCreatedUnix * 1000 > new Date(last).getTime();
}

// Simple in-memory rate limiter: max 20 requests per IP per minute.
const ipRequests = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ipRequests.get(ip) ?? []).filter((t) => now - t < 60000);
  if (recent.length >= 20) return true;
  recent.push(now);
  ipRequests.set(ip, recent);
  return false;
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("cf-connecting-ip") || "unknown";
        if (isRateLimited(ip)) {
          return new Response("Rate limited", { status: 429 });
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
          console.error("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET");
          return new Response("Server misconfigured", { status: 500 });
        }

        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          return new Response("Missing signature", { status: 400 });
        }

        // RAW body bytes are required for signature verification.
        const rawBody = await request.text();

        const { getStripe } = await import("@/lib/stripe.server");
        const stripe = getStripe();

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            webhookSecret,
          );
        } catch (err) {
          console.error("[stripe-webhook] Signature verification failed", err);
          return new Response("Invalid signature", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as { from: (t: string) => any };

        // Idempotency: ignore events we've already processed.
        // A failed lookup must never be treated as "new event": doing so would
        // replay the writes below blind, with no idempotency protection.
        const { data: alreadyProcessed, error: idempotencyError } = await db
          .from("processed_webhooks")
          .select("stripe_event_id")
          .eq("stripe_event_id", event.id)
          .maybeSingle();
        // PGRST116 is "no rows found". maybeSingle() normally reports that as
        // data: null with no error, but it is tolerated explicitly so the
        // ordinary new-event path is never confused with a real read failure.
        if (idempotencyError && (idempotencyError as { code?: string }).code !== "PGRST116") {
          console.error("[stripe-webhook] idempotency check failed", idempotencyError);
          return new Response("Idempotency check failed", { status: 500 });
        }
        if (alreadyProcessed) {
          return new Response("ok", { status: 200 });
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const session = event.data.object as Stripe.Checkout.Session;
              const userId =
                session.metadata?.supabase_user_id ?? session.client_reference_id;
              const subscriptionId =
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription?.id;
              const customerId =
                typeof session.customer === "string"
                  ? session.customer
                  : session.customer?.id;

              if (!userId || !subscriptionId) {
                console.error("[stripe-webhook] Missing userId/subscriptionId on session");
                break;
              }

              const subscription = await stripe.subscriptions.retrieve(subscriptionId);

              const eventCreatedISO = new Date(event.created * 1000).toISOString();
              const { error } = await db
                .from("subscriptions")
                .upsert(
                  {
                    user_id: userId,
                    plan: "pro",
                    status: subscription.status,
                    stripe_customer_id: customerId ?? null,
                    stripe_subscription_id: subscription.id,
                    current_period_end: periodEndISO(subscription),
                    last_stripe_event_created: eventCreatedISO,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id" },
                );
              // A failed upgrade write must surface as an error so Stripe
              // retries the event. Returning 200 here would drop the upgrade
              // silently while the customer is already charged.
              if (error) {
                console.error("[stripe-webhook] upsert error", error);
                return new Response("Subscription upsert failed", { status: 500 });
              }
              break;
            }

            case "customer.subscription.updated": {
              const subscription = event.data.object as Stripe.Subscription;
              if (!(await isNewerEvent(db, subscription.id, event.created))) {
                console.log(
                  `[stripe-webhook] Ignoring out-of-order subscription.updated for ${subscription.id}`,
                );
                break;
              }
              const { error } = await db
                .from("subscriptions")
                .update({
                  status: subscription.status,
                  current_period_end: periodEndISO(subscription),
                  last_stripe_event_created: new Date(event.created * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);
              // Same contract as checkout.session.completed: a failed write has
              // to reach Stripe as an error so the event is redelivered.
              if (error) {
                console.error("[stripe-webhook] subscription.updated error", error);
                return new Response("Subscription update failed", { status: 500 });
              }
              break;
            }

            case "customer.subscription.deleted": {
              const subscription = event.data.object as Stripe.Subscription;
              if (!(await isNewerEvent(db, subscription.id, event.created))) {
                console.log(
                  `[stripe-webhook] Ignoring out-of-order subscription.deleted for ${subscription.id}`,
                );
                break;
              }
              const { error } = await db
                .from("subscriptions")
                .update({
                  plan: "free",
                  status: "canceled",
                  last_stripe_event_created: new Date(event.created * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);
              // Losing this write is the most expensive failure of the four: the
              // customer cancelled, and a dropped event leaves them on Pro
              // indefinitely. It must be redelivered.
              if (error) {
                console.error("[stripe-webhook] subscription.deleted error", error);
                return new Response("Subscription downgrade failed", { status: 500 });
              }
              break;
            }

            case "invoice.payment_failed": {
              const invoice = event.data.object as Stripe.Invoice;
              const subscriptionId =
                typeof (invoice as unknown as { subscription?: string | { id?: string } })
                  .subscription === "string"
                  ? ((invoice as unknown as { subscription?: string }).subscription as string)
                  : (invoice as unknown as { subscription?: { id?: string } }).subscription?.id;
              if (subscriptionId) {
                const { error } = await db
                  .from("subscriptions")
                  .update({
                    status: "past_due",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("stripe_subscription_id", subscriptionId);
                // NOTE: this write only records status = past_due. It does not
                // change `plan`, and access is gated on `plan` alone (see
                // consume_generation in the migrations and fetchUsage in
                // src/lib/db.ts), so a failed payment does not by itself remove
                // Pro access even when this write succeeds. Whether it should is
                // a product decision, deliberately not made here. The error
                // handling is aligned with the other three regardless.
                if (error) {
                  console.error("[stripe-webhook] payment_failed error", error);
                  return new Response("Payment failure update failed", { status: 500 });
                }
              }
              break;
            }

            default:
              // Unhandled event types are acknowledged without processing.
              break;
          }
        } catch (err) {
          console.error("[stripe-webhook] Handler error", err);
          return new Response("Handler error", { status: 500 });
        }

        // Mark event as processed for idempotency.
        // This failure is deliberately handled differently from the two above:
        // by this point the subscription write already succeeded. Returning 500
        // would make Stripe retry and reprocess the whole upgrade, and the
        // idempotency guard that would have stopped the replay is precisely
        // what failed to be written. A duplicate upgrade is worse than a
        // missing marker row, so the event is acknowledged and the gap is
        // logged loudly for manual follow-up instead.
        const { error: markError } = await db
          .from("processed_webhooks")
          .insert({ stripe_event_id: event.id });
        if (markError) {
          // 23505 is a unique violation: a concurrent delivery already marked
          // this event. Benign race, not a durability gap.
          if ((markError as { code?: string }).code === "23505") {
            console.warn(
              "[stripe-webhook] event already marked as processed by a concurrent delivery",
              { stripe_event_id: event.id },
            );
          } else {
            console.error(
              "[stripe-webhook] CRITICAL: event processed but NOT marked as processed. " +
                "A future redelivery of this event would be reprocessed instead of skipped.",
              { stripe_event_id: event.id, error: markError },
            );
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
