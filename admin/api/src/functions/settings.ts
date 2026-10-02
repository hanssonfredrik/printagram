import { audit, badRequest, json, readJson } from '../core.js';
import { adminRoute } from '../lib/route.js';
import { getVatRatePct, setVatRatePct } from '../lib/settings.js';

adminRoute('settingsGet', { methods: ['GET'], route: 'settings' }, async () =>
  json({ vatRatePct: await getVatRatePct() }),
);

/** PUT settings { vatRatePct } */
adminRoute('settingsUpdate', { methods: ['PUT'], route: 'settings' }, async ({ req, note }) => {
  const b = await readJson<{ vatRatePct?: unknown }>(req);
  const pct = Number(b.vatRatePct);
  if (!Number.isFinite(pct) || pct < 0 || pct > 50 || Math.round(pct * 100) !== pct * 100)
    throw badRequest(
      'INVALID_FIELD',
      'VAT rate must be a percentage between 0 and 50 (two decimals at most).',
    );
  const before = await getVatRatePct();
  await setVatRatePct(pct);
  note(`vatRatePct ${before} → ${pct}`, 'settings');
  return json({ vatRatePct: pct });
});

/** GET audit?month=yyyy-mm (newest first). */
adminRoute('auditList', { methods: ['GET'], route: 'audit' }, async ({ req }) => {
  const month = req.query.get('month') || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) throw badRequest('INVALID_FIELD', 'month must be yyyy-mm.');
  return json({ month, items: await audit.listMonth(month) });
});
