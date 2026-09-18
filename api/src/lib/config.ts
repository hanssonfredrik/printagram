import type { PricingConfig } from '@printagram/shared';

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
      baseCents: int('PRICE_BASE_CENTS', 900),
      includedPages: int('PRICE_INCLUDED_PAGES', 40),
      extraPageCents: int('PRICE_EXTRA_PAGE_CENTS', 15),
      currency: 'eur',
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
    return int('MAX_PHOTOS_PER_BOOK', 600);
  },
  get connectEnabled() {
    return (
      bool('FEATURE_CONNECT_ENABLED', false) &&
      !!process.env.IG_APP_ID &&
      !!process.env.IG_APP_SECRET
    );
  },
  get instagram() {
    return {
      appId: process.env.IG_APP_ID ?? '',
      appSecret: process.env.IG_APP_SECRET ?? '',
      redirectUri: process.env.IG_REDIRECT_URI ?? `${this.appBaseUrl}/api/instagram/callback`,
    };
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
      from: process.env.EMAIL_FROM ?? 'Printagram <hello@printagram.app>',
    };
  },
  get isDev() {
    return (
      process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' || !process.env.WEBSITE_INSTANCE_ID
    );
  },
};
