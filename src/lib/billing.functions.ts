import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function resolveBaseUrl(): string {
  const origin = getRequestHeader("origin");
  if (origin) return origin;
  const host = getRequestHeader("host");
  const proto = getRequestHeader("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  throw new Error("Unable to resolve request origin");
}

/**
 * Creates a Stripe Checkout Session (subscription mode) for the Pro plan and
 * returns its URL for the frontend to redirect to.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const priceId = process.env.STRIPE_PRICE_ID_PRO;
    if (!priceId) {
      console.error("[billing] Missing STRIPE_PRICE_ID_PRO environment variable.");
      throw new Error("BILLING_CONFIG_ERROR");
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[billing] Missing STRIPE_SECRET_KEY environment variable.");
      throw new Error("BILLING_CONFIG_ERROR");
    }

    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();
    const baseUrl = resolveBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: context.userId,
      metadata: { supabase_user_id: context.userId },
      subscription_data: {
        metadata: { supabase_user_id: context.userId },
      },
      success_url: `${baseUrl}/app?upgraded=true`,
      cancel_url: `${baseUrl}/upgrade`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }
    return { url: session.url };
  });

/**
 * Creates a Stripe Billing Portal Session for the current Pro user and returns
 * its URL so the frontend can redirect the user to manage their subscription.
 */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as unknown as {
      from: (t: string) => any;
    };

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[billing] Missing STRIPE_SECRET_KEY environment variable.");
      throw new Error("BILLING_CONFIG_ERROR");
    }

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .maybeSingle();
    if (error) throw new Error("Failed to load subscription.");

    const customerId = (sub as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) {
      throw new Error("NO_CUSTOMER");
    }

    const { getStripe } = await import("./stripe.server");
    const stripe = getStripe();
    const baseUrl = resolveBaseUrl();

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/app`,
    });

    return { url: portal.url };
  });
