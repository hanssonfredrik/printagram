import { MAX_PHOTOS_PER_BOOK, type PricingConfig } from '@printagram/shared';

function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing app setting ${name}`);
  }
  return v;
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return /^(1|true|yes|on)$/i.test(v);
}

export const config = {
  get appBaseUrl() {
    return env('APP_BASE_URL', 'http://localhost:4280').replace(/\/$/, '');
  },
  get storageConnectionString() {
    return env('STORAGE_CONNECTION_STRING', 'UseDevelopmentStorage=true');
  },
  get jwtSecret() {
    return env('AUTH_JWT_SECRET', 'dev-only-insecure-jwt-secret-change-me');
  },
  get tokenEncKey() {
    return env('TOKEN_ENC_KEY', 'dev-only-insecure-enc-key-change-me!!');
  },
  get cronSecret() {
    return env('CRON_SECRET', 'dev-cron-secret');
  },
  get cookieSecure() {
    return bool('COOKIE_SECURE', true);
  },
  get pricing(): PricingConfig {
    return {
      eur: {
        baseCents: int('PRICE_BASE_CENTS', 900),
        printedFrom: {
          softcoverCents: int('PRICE_SOFTCOVER_FROM_CENTS', 2900),
          hardcoverCents: int('PRICE_HARDCOVER_FROM_CENTS', 4900),
        },
      },
      sek: {
        baseCents: int('PRICE_BASE_CENTS_SEK', 8900),
        printedFrom: {
          softcoverCents: int('PRICE_SOFTCOVER_FROM_CENTS_SEK', 29900),
          hardcoverCents: int('PRICE_HARDCOVER_FROM_CENTS_SEK', 49900),
        },
      },
    };
  },
  get retentionDays() {
    return int('LIBRARY_RETENTION_DAYS', 90);
  },
  get reminderDaysBefore() {
    return int('REMINDER_DAYS_BEFORE', 7);
  },
  get maxPhotosPerLibrary() {
    return int('MAX_PHOTOS_PER_LIBRARY', 10_000);
  },
  get maxPhotosPerBook() {
    return MAX_PHOTOS_PER_BOOK;
  },
  get connectEnabled() {
    return (
      bool('FEATURE_CONNECT_ENABLED', false) &&
      !!process.env.IG_APP_ID &&
      !!process.env.IG_APP_SECRET
    );
  },
  get googlePhotosEnabled() {
    return (
      bool('FEATURE_GOOGLE_PHOTOS_ENABLED', false) &&
      !!process.env.GOOGLE_CLIENT_ID &&
      !!process.env.GOOGLE_CLIENT_SECRET
    );
  },
  get google() {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI ?? `${this.appBaseUrl}/api/google/callback`,
    };
  },
  get instagram() {
    return {
      appId: process.env.IG_APP_ID ?? '',
      appSecret: process.env.IG_APP_SECRET ?? '',
      redirectUri: process.env.IG_REDIRECT_URI ?? `${this.appBaseUrl}/api/instagram/callback`,
    };
  },
  /**
   * Payment provider, chosen explicitly (never inferred from which keys happen to be set).
   * "fake" takes no money and is the default until real payments are switched on.
   */
  get paymentProvider(): 'fake' | 'stripe' {
    const v = (process.env.PAYMENT_PROVIDER ?? 'fake').trim().toLowerCase();
    if (v !== 'fake' && v !== 'stripe')
      throw new Error(`PAYMENT_PROVIDER must be "fake" or "stripe", got "${v}"`);
    return v;
  },
  get bleedMm() {
    return int('PRINT_BLEED_MM', 4);
  },
  get stripe() {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY ?? '',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
      get enabled() {
        return !!this.secretKey && !!this.publishableKey;
      },
    };
  },
  get email() {
    return {
      provider: (process.env.EMAIL_PROVIDER ?? 'console') as 'console' | 'resend',
      resendApiKey: process.env.RESEND_API_KEY ?? '',
      from: process.env.EMAIL_FROM ?? 'Inbunden <hello@inbunden.com>',
    };
  },
  get isDev() {
    return (
      process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' || !process.env.WEBSITE_INSTANCE_ID
    );
  },
};
