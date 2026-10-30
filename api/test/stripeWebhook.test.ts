/**
 * Stripe webhook: the real handler, in-process against Azurite, with the Stripe SDK stubbed so
 * the event is whatever the test says it is. Skipped without Azurite (like routes.test.ts).
 */
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type * as AzureFunctions from '@azure/functions';
import {
  HttpRequest,
  type HttpHandler,
  type HttpResponseInit,
  type InvocationContext,
} from '@azure/functions';

process.env.STORAGE_CONNECTION_STRING ??= 'UseDevelopmentStorage=true';
process.env.PAYMENT_PROVIDER = 'stripe';
process.env.STRIPE_SECRET_KEY = 'sk_test_webhook';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_webhook';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_webhook';
process.env.EMAIL_PROVIDER = 'console';

const handlers = new Map<string, HttpHandler>();
vi.mock('@azure/functions', async (orig) => {
  const mod = await orig<typeof AzureFunctions>();
  return {
    ...mod,
    app: {
      ...mod.app,
      http: (name: string, o: { handler: HttpHandler }) => handlers.set(name, o.handler),
      timer: () => undefined,
    },
  };
});

/** The "signed" event is the request body itself; a bad signature header throws like Stripe does. */
vi.mock('../src/lib/stripe.js', () => ({
  stripe: () => ({
    webhooks: {
      constructEvent: (raw: string, sig: string) => {
        if (sig !== 'good') throw new Error('No signatures found matching the expected signature');
        return JSON.parse(raw);
      },
    },
  }),
  stripeEnabled: () => true,
}));

function azuriteUp(): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ host: '127.0.0.1', port: 10002 });
    s.setTimeout(500);
    s.once('connect', () => (s.destroy(), resolve(true)));
    s.once('error', () => resolve(false));
    s.once('timeout', () => (s.destroy(), resolve(false)));
  });
}
const up = await azuriteUp();
if (!up && process.env.REQUIRE_AZURITE) throw new Error('Azurite is not reachable on :10002');

const ctx = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
} as unknown as InvocationContext;

async function post(event: unknown, sig = 'good') {
  const h = handlers.get('stripeWebhook');
  if (!h) throw new Error('no handler stripeWebhook');
  const req = new HttpRequest({
    method: 'POST',
    url: 'https://inbunden.test/api/stripe/webhook',
    headers: { 'stripe-signature': sig, 'content-type': 'application/json' },
    body: { string: JSON.stringify(event) },
  });
  const res = (await h(req, ctx)) as HttpResponseInit;
  return { status: res.status ?? 200, body: res.jsonBody as Record<string, unknown> };
}

function orderRow(userId: string, orderId: string, pi: string) {
  return {
    orderId,
    userId,
    bookId: `book-${orderId}`,
    bookVersion: 1,
    contentHash: 'h',
    libraryId: 'lib',
    source: 'export',
    sourceLabel: 'test.zip',
    title: 'Webhook book',
    format: 'square',
    showMeta: true,
    coverPhotoId: null,
    layout: {},
    pages: [],
    photoIds: ['ex_1'],
    pageCount: 24,
    photoCount: 1,
    subtotalCents: 900,
    discountCents: 0,
    promoCode: null,
    amountCents: 900,
    currency: 'eur',
    status: 'created',
    paymentProvider: 'stripe',
    failureReason: null,
    stripePaymentIntentId: pi,
    stripeLivemode: null,
    paidAt: null,
    pdfBlob: null,
    pdfVersion: 0,
    pdfBytes: null,
    pdfPages: null,
    readyAt: null,
    shareToken: null,
    createdAt: new Date().toISOString(),
  };
}

const intentEvent = (
  type: string,
  pi: string,
  meta: { orderId: string; userId: string },
  livemode: boolean,
  extra: Record<string, unknown> = {},
) => ({
  id: `evt_${randomUUID()}`,
  type,
  livemode,
  data: { object: { id: pi, object: 'payment_intent', metadata: meta, ...extra } },
});

describe.skipIf(!up)('Stripe webhook against Azurite', () => {
  beforeAll(async () => {
    const { ensureTables } = await import('../src/lib/tables.js');
    await ensureTables();
    await import('../src/functions/stripeWebhook.js');
  });

  it('rejects a bad signature', async () => {
    const r = await post({ id: 'evt_x', type: 'payment_intent.succeeded' }, 'bad');
    expect(r.status).toBe(400);
  });

  it('marks the order paid and remembers that it was a test-mode payment', async () => {
    const { orders } = await import('../src/lib/tables.js');
    const userId = randomUUID().replace(/-/g, '');
    const orderId = randomUUID();
    const pi = `pi_${randomUUID().replace(/-/g, '')}`;
    await orders.upsert(orderRow(userId, orderId, pi) as never);

    const event = intentEvent('payment_intent.succeeded', pi, { orderId, userId }, false);
    const first = await post(event);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ received: true });

    const row = await orders.get(userId, orderId);
    expect(row).toMatchObject({
      status: 'paid',
      stripePaymentIntentId: pi,
      stripeLivemode: false,
      source: 'export',
    });
    expect(row?.paidAt).toBeTruthy();

    // The same event id again is a no-op.
    const again = await post(event);
    expect(again.body).toEqual({ received: true, duplicate: true });
  });

  it('records a failed attempt with its reason, and that it was live', async () => {
    const { orders } = await import('../src/lib/tables.js');
    const userId = randomUUID().replace(/-/g, '');
    const orderId = randomUUID();
    const pi = `pi_${randomUUID().replace(/-/g, '')}`;
    await orders.upsert(orderRow(userId, orderId, pi) as never);

    const r = await post(
      intentEvent('payment_intent.payment_failed', pi, { orderId, userId }, true, {
        last_payment_error: { message: 'Your card was declined.' },
      }),
    );
    expect(r.status).toBe(200);
    const row = await orders.get(userId, orderId);
    expect(row).toMatchObject({
      status: 'failed',
      failureReason: 'Your card was declined.',
      stripeLivemode: true,
    });
  });

  it('ignores events for unknown orders without failing', async () => {
    const r = await post(
      intentEvent(
        'payment_intent.succeeded',
        'pi_none',
        { orderId: 'nope', userId: 'nobody' },
        true,
      ),
    );
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ received: true });
  });
});
