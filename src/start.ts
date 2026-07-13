import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Content-Security-Policy allowing only the origins the app actually needs:
// Supabase (auth/data/realtime) and Stripe (checkout + billing scripts/iframes).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // Vite/React and Stripe.js need inline bootstrap; Stripe scripts served from js.stripe.com.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
  // Tailwind/inline styles + Google Fonts stylesheet used in __root head.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  // Supabase REST/Auth/Storage over https + Realtime over wss; Stripe API.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  // Stripe Checkout / 3DS iframes.
  "frame-src https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
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

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
