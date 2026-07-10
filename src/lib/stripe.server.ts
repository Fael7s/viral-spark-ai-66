// Server-only Stripe client. Never import from client/route module scope
// except via dynamic import inside a handler, or from other *.server.ts files.
import Stripe from "stripe";

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
    }
    _stripe = new Stripe(key, {
      // Rely on the SDK's pinned API version; use fetch client for Workers.
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return _stripe;
}
