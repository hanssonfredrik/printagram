import { normalizePromoCode, type PromoDefinition } from '@printagram/shared';
import { badRequest, conflict, json, notFound, promos, readJson } from '../core.js';
import { adminRoute } from '../lib/route.js';

/** Discount codes: the same rows scripts/promo.ts manages (Lookups, kind "promo"). */

function isoOrNull(v: unknown, field: string, endOfDay = false): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v))
    throw badRequest('INVALID_FIELD', `${field} must be a date (yyyy-mm-dd).`);
  const d = new Date(v.length === 10 ? `${v}T${endOfDay ? '23:59:59' : '00:00:00'}Z` : v);
  if (Number.isNaN(d.getTime())) throw badRequest('INVALID_FIELD', `${field} is not a valid date.`);
  return d.toISOString();
}

function maxOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1)
    throw badRequest('INVALID_FIELD', 'Max uses must be a whole number ≥ 1.');
  return n;
}

adminRoute('promosList', { methods: ['GET'], route: 'promos' }, async () => {
  const all = await promos.list();
  all.sort((a, b) => a.code.localeCompare(b.code));
  return json({ items: all });
});

/** POST promos { code, type: percent|fixed, value, validFrom?, validUntil?, maxRedemptions?, perUserOnce? } */
adminRoute('promosCreate', { methods: ['POST'], route: 'promos' }, async ({ req, note }) => {
  const b = await readJson<Record<string, unknown>>(req);
  const code = normalizePromoCode(String(b.code ?? ''));
  if (!/^[A-Z0-9_-]{3,32}$/.test(code))
    throw badRequest('INVALID_FIELD', 'Code must be 3–32 letters, digits, - or _.');
  const type = b.type;
  if (type !== 'percent' && type !== 'fixed')
    throw badRequest('INVALID_FIELD', 'Type must be percent or fixed.');
  const value = Number(b.value);
  if (!Number.isInteger(value) || value < 1 || (type === 'percent' && value > 100))
    throw badRequest(
      'INVALID_FIELD',
      type === 'percent' ? 'Percent must be 1–100.' : 'Amount is in cents and must be ≥ 1.',
    );
  if (await promos.get(code)) throw conflict('EXISTS', `${code} already exists.`);
  const p: PromoDefinition = {
    code,
    type,
    value,
    validFrom: isoOrNull(b.validFrom, 'Valid from'),
    validUntil: isoOrNull(b.validUntil, 'Valid until', true),
    maxRedemptions: maxOrNull(b.maxRedemptions),
    redemptions: 0,
    perUserOnce: b.perUserOnce === true,
    active: true,
  };
  await promos.upsert(p);
  note(`created ${code} (${type} ${value})`, code);
  return json(p, 201);
});

/** PATCH promos/{code} { active?, validUntil?, maxRedemptions? } */
adminRoute(
  'promosUpdate',
  { methods: ['PATCH'], route: 'promos/{code}' },
  async ({ req, note }) => {
    const code = normalizePromoCode(req.params.code ?? '');
    const existing = await promos.get(code);
    if (!existing) throw notFound('Code');
    const { etag: _etag, ...p } = existing;
    const b = await readJson<Record<string, unknown>>(req);
    const changes: string[] = [];
    if (b.active !== undefined) {
      if (typeof b.active !== 'boolean')
        throw badRequest('INVALID_FIELD', 'active must be true or false.');
      p.active = b.active;
      changes.push(`active=${b.active}`);
    }
    if (b.validUntil !== undefined) {
      p.validUntil = isoOrNull(b.validUntil, 'Valid until', true);
      changes.push(`validUntil=${p.validUntil ?? 'none'}`);
    }
    if (b.maxRedemptions !== undefined) {
      p.maxRedemptions = maxOrNull(b.maxRedemptions);
      changes.push(`maxRedemptions=${p.maxRedemptions ?? 'none'}`);
    }
    // Keep the live counter: re-read just before writing so a concurrent checkout is not lost.
    const fresh = await promos.get(code);
    await promos.upsert({ ...p, redemptions: fresh?.redemptions ?? p.redemptions });
    note(changes.join('; ') || 'no change', code);
    return json(p);
  },
);
