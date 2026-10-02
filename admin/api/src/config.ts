/**
 * Admin app settings. Unlike the main API there are no fallbacks in production: a missing or
 * short secret stops the app at load time (every function then fails), instead of running with a
 * guessable key.
 */

const MIN_SECRET = 32;

/** Local func host / tests: no WEBSITE_INSTANCE_ID (set by Azure on every real instance). */
export const isDev = () =>
  process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' || !process.env.WEBSITE_INSTANCE_ID;

function secret(name: string): string {
  const v = process.env[name] ?? '';
  if (v.length >= MIN_SECRET) return v;
  if (isDev()) return `dev-only-insecure-${name.toLowerCase()}-0123456789abcdef`;
  throw new Error(`App setting ${name} is missing or shorter than ${MIN_SECRET} characters`);
}

export const adminConfig = {
  get jwtSecret() {
    return secret('ADMIN_JWT_SECRET');
  },
  get totpEncKey() {
    return secret('ADMIN_TOTP_ENC_KEY');
  },
  get cookieSecure() {
    const v = process.env.COOKIE_SECURE;
    return v === undefined || v === '' ? true : /^(1|true|yes|on)$/i.test(v);
  },
};

/** Called once at load (src/index.ts): fail closed on a misconfigured production app. */
export function assertConfig(): void {
  void adminConfig.jwtSecret;
  void adminConfig.totpEncKey;
  if (!isDev()) {
    if (!process.env.STORAGE_CONNECTION_STRING)
      throw new Error('App setting STORAGE_CONNECTION_STRING is missing');
    if (!adminConfig.cookieSecure) throw new Error('COOKIE_SECURE must not be false in production');
  }
  if (process.env.ADMIN_JWT_SECRET && process.env.ADMIN_JWT_SECRET === process.env.AUTH_JWT_SECRET)
    throw new Error('ADMIN_JWT_SECRET must differ from the main app AUTH_JWT_SECRET');
}
