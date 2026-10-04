/**
 * Manage discount codes (stored in the Lookups table, kind "promo").
 *
 *   npx tsx scripts/promo.ts list
 *   npx tsx scripts/promo.ts create SUMMER25 percent 25 [--until 2026-12-31] [--max 100] [--once]
 *   npx tsx scripts/promo.ts create FIVEOFF fixed 500            # 500 cents = €5
 *   npx tsx scripts/promo.ts create FEMTIO fixed 5000 --currency sek   # 50 kr, Swedish site only
 *   npx tsx scripts/promo.ts disable SUMMER25
 *   npx tsx scripts/promo.ts seed                                # WELCOME100 (100 %) + TEST20 (20 %)
 *
 * Uses STORAGE_CONNECTION_STRING (default: Azurite).
 */
import { normalizePromoCode, type PromoDefinition, type PromoType } from '@printagram/shared';
import { ensureTables, promos } from '../api/src/lib/tables.js';

process.env.STORAGE_CONNECTION_STRING ??= 'UseDevelopmentStorage=true';

function flag(args: string[], name: string): string | null {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? null) : null;
}

function define(
  code: string,
  type: PromoType,
  value: number,
  extra: Partial<PromoDefinition> = {},
): PromoDefinition {
  if (type === 'percent' && (value < 1 || value > 100)) throw new Error('percent must be 1–100');
  if (type === 'fixed' && value < 1) throw new Error('fixed value is in cents and must be ≥ 1');
  return {
    code: normalizePromoCode(code),
    type,
    value,
    validFrom: null,
    validUntil: null,
    maxRedemptions: null,
    redemptions: 0,
    perUserOnce: false,
    active: true,
    ...extra,
  };
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  await ensureTables();
  switch (cmd) {
    case 'list': {
      const all = await promos.list();
      if (all.length === 0) console.log('No codes.');
      for (const p of all) {
        const amount = (p.value / 100).toFixed(2);
        const v =
          p.type === 'percent'
            ? `${p.value} %`
            : p.currency === 'sek'
              ? `${amount} kr`
              : `€${amount}`;
        console.log(
          `${p.code.padEnd(16)} ${v.padEnd(8)} used ${p.redemptions}${p.maxRedemptions !== null ? `/${p.maxRedemptions}` : ''}` +
            `${p.perUserOnce ? ' · once per user' : ''}${p.validUntil ? ` · until ${p.validUntil.slice(0, 10)}` : ''}${p.active ? '' : ' · DISABLED'}`,
        );
      }
      break;
    }
    case 'create': {
      const [code, type, value] = args;
      if (!code || (type !== 'percent' && type !== 'fixed') || !value)
        throw new Error('usage: create CODE percent|fixed VALUE');
      const until = flag(args, '--until');
      const max = flag(args, '--max');
      const currency = flag(args, '--currency') ?? 'eur';
      if (currency !== 'eur' && currency !== 'sek')
        throw new Error('--currency must be eur or sek');
      const p = define(code, type, Number(value), {
        ...(type === 'fixed' ? { currency } : {}),
        validUntil: until ? new Date(`${until}T23:59:59Z`).toISOString() : null,
        maxRedemptions: max ? Number(max) : null,
        perUserOnce: args.includes('--once'),
      });
      await promos.upsert(p);
      console.log(`Created ${p.code}`);
      break;
    }
    case 'disable': {
      const code = normalizePromoCode(args[0] ?? '');
      const p = await promos.get(code);
      if (!p) throw new Error(`No code ${code}`);
      const { etag: _etag, ...rest } = p;
      await promos.upsert({ ...rest, active: false });
      console.log(`Disabled ${code}`);
      break;
    }
    case 'seed': {
      for (const p of [
        define('WELCOME100', 'percent', 100, { perUserOnce: true }),
        define('TEST20', 'percent', 20),
      ]) {
        if (!(await promos.get(p.code))) await promos.upsert(p);
      }
      console.log('Seeded test codes WELCOME100 (100 %, once per user) and TEST20 (20 %).');
      break;
    }
    default:
      throw new Error('usage: promo.ts list | create | disable | seed');
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
