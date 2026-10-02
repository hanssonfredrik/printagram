import { json, libraries, orders, users, visits, type VisitRow } from '../core.js';
import { adminRoute } from '../lib/route.js';
import { range } from './orders.js';

/** Every day in [from, to] (yyyy-mm-dd), so charts have no gaps. */
export function days(from: string, to: string): string[] {
  const out: string[] = [];
  for (
    let d = new Date(`${from}T00:00:00Z`);
    d.toISOString().slice(0, 10) <= to;
    d.setUTCDate(d.getUTCDate() + 1)
  )
    out.push(d.toISOString().slice(0, 10));
  return out;
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

function top(m: Map<string, { views: number; visitors: Set<string> }>, n = 20) {
  return [...m]
    .map(([key, v]) => ({ key, views: v.views, visitors: v.visitors.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, n);
}

/** Aggregates beacon rows. "visitors" counts visitor-days: the hash changes daily by design. */
export function aggregateVisits(rows: Iterable<VisitRow>, from: string, to: string) {
  const perDay = new Map(days(from, to).map((d) => [d, { views: 0, visitors: new Set<string>() }]));
  const paths = new Map<string, { views: number; visitors: Set<string> }>();
  const refs = new Map<string, { views: number; visitors: Set<string> }>();
  const devices = new Map<string, { views: number; visitors: Set<string> }>();
  const langs = new Map<string, { views: number; visitors: Set<string> }>();
  const add = (m: typeof paths, key: string, who: string) => {
    const e = m.get(key) ?? { views: 0, visitors: new Set<string>() };
    e.views++;
    e.visitors.add(who);
    m.set(key, e);
  };
  let views = 0;
  const all = new Set<string>();
  for (const r of rows) {
    const who = `${r.day}|${r.visitor}`;
    views++;
    all.add(who);
    const d = perDay.get(r.day);
    if (d) {
      d.views++;
      d.visitors.add(who);
    }
    add(paths, r.path, who);
    if (r.ref) add(refs, r.ref, who);
    add(devices, r.device, who);
    add(langs, r.lang || 'unknown', who);
  }
  return {
    views,
    visitors: all.size,
    byDay: [...perDay].map(([d, v]) => ({ day: d, views: v.views, visitors: v.visitors.size })),
    topPaths: top(paths),
    topReferrers: top(refs),
    devices: top(devices, 5),
    langs: top(langs, 5),
  };
}

async function visitRows(from: string, to: string): Promise<VisitRow[]> {
  const out: VisitRow[] = [];
  for await (const r of visits.scanRange(from, to)) out.push(r);
  return out;
}

adminRoute('statsVisits', { methods: ['GET'], route: 'stats/visits' }, async ({ req }) => {
  const { from, to } = range(req.query);
  return json({ from, to, ...aggregateVisits(await visitRows(from, to), from, to) });
});

/** GET stats/overview?from&to - users, orders, revenue, libraries and visits in one call. */
adminRoute('statsOverview', { methods: ['GET'], route: 'stats/overview' }, async ({ req }) => {
  const { from, to } = range(req.query);
  const now = Date.now();
  const since = (n: number) => new Date(now - n * 86_400_000).toISOString();
  const series = new Map(
    days(from, to).map((d) => [d, { signups: 0, orders: 0, stripeCents: 0, fakeCents: 0 }]),
  );

  const u = { registered: 0, anonymous: 0, admins: 0, active7: 0, active30: 0, signupsInRange: 0 };
  for await (const row of users.scanAll()) {
    if (!row.email) {
      u.anonymous++;
      continue;
    }
    u.registered++;
    if (row.isAdmin === true) u.admins++;
    if (row.lastSeenAt >= since(7)) u.active7++;
    if (row.lastSeenAt >= since(30)) u.active30++;
    const s = series.get(day(row.createdAt));
    if (s) {
      s.signups++;
      u.signupsInRange++;
    }
  }

  const byStatus: Record<string, number> = {};
  const payers = new Set<string>();
  const paid = { count: 0, stripeCents: 0, fakeCents: 0 };
  for await (const o of orders.scanAll()) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (o.status !== 'paid' && o.status !== 'ready') continue;
    payers.add(o.userId);
    const s = series.get(day(o.paidAt));
    if (!s) continue;
    s.orders++;
    paid.count++;
    if (o.paymentProvider === 'stripe') {
      s.stripeCents += o.amountCents;
      paid.stripeCents += o.amountCents;
    } else {
      s.fakeCents += o.amountCents;
      paid.fakeCents += o.amountCents;
    }
  }

  const libs = { active: 0, photos: 0, expired: 0 };
  for await (const l of libraries.scanAll()) {
    if (l.status === 'ready' || l.status === 'importing') {
      libs.active++;
      libs.photos += l.photoCount;
    } else if (l.status === 'expired') libs.expired++;
  }

  const v = aggregateVisits(await visitRows(from, to), from, to);
  const visitsByDay = new Map(v.byDay.map((x) => [x.day, x]));
  return json({
    from,
    to,
    users: { ...u, payers: payers.size },
    orders: { byStatus, paidInRange: paid },
    libraries: libs,
    visits: { views: v.views, visitors: v.visitors, topPaths: v.topPaths.slice(0, 5) },
    byDay: [...series].map(([d, s]) => ({
      day: d,
      ...s,
      views: visitsByDay.get(d)?.views ?? 0,
      visitors: visitsByDay.get(d)?.visitors ?? 0,
    })),
  });
});
