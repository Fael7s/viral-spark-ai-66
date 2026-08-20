/**
 * First-touch attribution captured in the browser and handed to signUp.
 *
 * UTM parameters arrive on the landing URL, which is almost never /auth: someone
 * clicks an ad, lands on "/", and only later opens the signup form. Reading the
 * query string in /auth alone would lose the origin of everyone who browsed
 * before creating an account, so the capture happens on the first load of any
 * route and the result waits in localStorage until signUp reads it.
 *
 * First touch, not last: if the key already exists nothing is overwritten. The
 * channel that brought someone in on their first visit is what answers "where
 * did this user come from", and overwriting would let every later direct return
 * claim the credit.
 */

const STORAGE_KEY = "vc_attribution";
const MAX_VALUE_LENGTH = 64;

/** Campaign tokens: alphanumerics, hyphen and underscore. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;
/**
 * Pathname: the token alphabet plus the slash, and it has to start with one.
 * Requiring the leading slash is what rejects "//evil.com", which would
 * otherwise be stored as a path and read later as a protocol-relative URL.
 */
const PATH_PATTERN = /^\/[A-Za-z0-9_/-]*$/;
/** ISO 8601 UTC, the exact shape Date.prototype.toISOString always produces. */
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  landing_path?: string;
  first_seen_at?: string;
}

function sanitize(value: unknown, pattern: RegExp): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_VALUE_LENGTH) return undefined;
  return pattern.test(trimmed) ? trimmed : undefined;
}

/**
 * Normalises a raw record, dropping every field that fails validation.
 *
 * Runs on the way in and on the way out. What comes back from localStorage is
 * editable by whoever owns the browser, so it deserves exactly as much trust as
 * the query string did, and both paths go through the same check rather than
 * assuming that whatever was stored is still well formed.
 */
function normalize(raw: Record<string, unknown>): Attribution {
  const record: Attribution = {};

  const source = sanitize(raw.utm_source, TOKEN_PATTERN);
  if (source) record.utm_source = source;

  const medium = sanitize(raw.utm_medium, TOKEN_PATTERN);
  if (medium) record.utm_medium = medium;

  const campaign = sanitize(raw.utm_campaign, TOKEN_PATTERN);
  if (campaign) record.utm_campaign = campaign;

  const landing = sanitize(raw.landing_path, PATH_PATTERN);
  if (landing) record.landing_path = landing;

  const firstSeen = sanitize(raw.first_seen_at, ISO_PATTERN);
  if (firstSeen) record.first_seen_at = firstSeen;

  return record;
}

/**
 * Records the first touch, once per browser. Called on the first load of any
 * route, from the root component.
 *
 * It writes even when the URL carries no UTM at all. That is how a direct
 * arrival gets recorded as direct, and it is what stops a later visit carrying
 * ?utm_source= from passing itself off as the first touch.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(STORAGE_KEY) !== null) return;
    const params = new URLSearchParams(window.location.search);
    const record = normalize({
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      landing_path: window.location.pathname,
      first_seen_at: new Date().toISOString(),
    });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage blocked (private mode, site data turned off). Attribution is
    // optional and must never take the page down with it.
  }
}

/**
 * Reads the stored attribution as metadata ready for options.data on signUp.
 *
 * Returns an empty object when there is nothing valid to send, so fields that
 * were never captured reach the database absent rather than as empty strings.
 */
export function attributionSignupMetadata(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return normalize(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}
