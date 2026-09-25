import type { AppConfig } from '@printagram/shared';
import { MAX_EXPORT_BYTES, TEST_CARDS } from '@printagram/shared';
import { createAnonymousUser, issueSession, sessionCookie, toUserInfo } from '../lib/auth.js';
import { config } from '../lib/config.js';
import { json, route } from '../lib/http.js';
import { libraries } from '../lib/tables.js';
import { libraryView } from '../lib/views.js';

route('config', { methods: ['GET'], route: 'config', auth: 'none' }, async () => {
  const body: AppConfig = {
    connectEnabled: config.connectEnabled,
    printedBooksEnabled: false,
    pricing: config.pricing,
    limits: {
      maxPhotosPerBook: config.maxPhotosPerBook,
      maxPhotosPerLibrary: config.maxPhotosPerLibrary,
      maxExportBytes: MAX_EXPORT_BYTES,
    },
    payment: {
      provider: config.paymentProvider,
      stripePublishableKey:
        config.paymentProvider === 'stripe' ? config.stripe.publishableKey : null,
      testCards: config.paymentProvider === 'fake' ? TEST_CARDS : [],
    },
    print: { bleedMm: config.bleedMm },
  };
  return json(body, 200, { headers: { 'Cache-Control': 'public, max-age=60' } });
});

route('health', { methods: ['GET'], route: 'health', auth: 'none' }, async () =>
  json({ ok: true, time: new Date().toISOString() }),
);

route(
  'sessionAnonymous',
  { methods: ['POST'], route: 'session/anonymous', auth: 'optional' },
  async ({ user }) => {
    if (user) {
      const libs = await libraries.list(user.userId);
      return json({ user: toUserInfo(user), libraries: libs.map(libraryView) });
    }
    const created = await createAnonymousUser();
    const token = await issueSession(created);
    return json({ user: toUserInfo(created), libraries: [] }, 200, {
      cookies: [sessionCookie(token)],
    });
  },
);

route('me', { methods: ['GET'], route: 'me', auth: 'optional' }, async ({ user }) => {
  if (!user) return json({ user: null, libraries: [] });
  const libs = await libraries.list(user.userId);
  return json({ user: toUserInfo(user), libraries: libs.map(libraryView) });
});
