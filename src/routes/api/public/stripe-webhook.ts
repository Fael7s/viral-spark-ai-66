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

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id" },
                );
              if (error) console.error("[stripe-webhook] upsert error", error);
              break;
            }

            case "customer.subscription.updated": {
              const subscription = event.data.object as Stripe.Subscription;
              const { error } = await db
                .from("subscriptions")
                .update({
                  status: subscription.status,
                  current_period_end: periodEndISO(subscription),
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);
              if (error) console.error("[stripe-webhook] update error", error);
              break;
            }

            case "customer.subscription.deleted": {
              const subscription = event.data.object as Stripe.Subscription;
              const { error } = await db
                .from("subscriptions")
                .update({
                  plan: "free",
                  status: "canceled",
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);
              if (error) console.error("[stripe-webhook] delete error", error);
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

        return new Response("ok", { status: 200 });
      },
    },
  },
});
