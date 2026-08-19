import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Content-Security-Policy allowing only the origins the app actually needs,
// which is Supabase (auth/data/realtime) and nothing else.
//
// No Stripe origin is listed. The only Stripe dependency is the server-side
// SDK: package.json carries "stripe" alone, and nothing imports
// @stripe/stripe-js, loadStripe, Elements or Embedded Checkout. Checkout is
// reached by assigning window.location.href to the session URL, which is a
// top-level navigation and is governed by none of script-src, frame-src or
// connect-src, so removing those entries does not affect the payment flow.
// form-action only constrains form submission targets and does not apply
// either.
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// 'unsafe-eval' is only needed for Vite's HMR in development; production builds
// must not allow eval(). 'unsafe-inline' stays for now (nonce-based CSP later).
const SCRIPT_SRC = IS_PRODUCTION
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // Vite/React need an inline bootstrap; no third-party script origin is used.
  SCRIPT_SRC,
  // Tailwind/inline styles + Google Fonts stylesheet used in __root head.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  // Supabase REST/Auth/Storage over https + Realtime over wss.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // The app embeds no iframes of its own and none from third parties.
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  setResponseHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  setResponseHeader("X-Content-Type-Options", "nosniff");
  setResponseHeader("X-Frame-Options", "DENY");
  setResponseHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  setResponseHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  return next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Function middleware. errorMiddleware above is a request middleware and never
// sees exceptions thrown inside createServerFn handlers, so without this every
// server function throw is serialized to the client with no server-side trace.
// It logs and rethrows the original error untouched: the UI maps errors by
// substring (upgrade.tsx, app.tsx), so replacing or wrapping it would break
// the user-facing message.
const functionErrorLogger = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    console.error("[serverFn] unhandled error", {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, functionErrorLogger],
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware],
}));
