/**
 * Runs every cron task against an API until each reports more=false.
 * Used by .github/workflows/cron.yml and for local testing:
 *
 *   CRON_URL=http://localhost:7071 CRON_SECRET=dev-cron-secret npx tsx scripts/cron.ts
 */
const base = (process.env.CRON_URL ?? 'http://localhost:7071').replace(/\/$/, '');
const key = process.env.CRON_SECRET ?? 'dev-cron-secret';
const tasks = (
  process.env.CRON_TASKS ??
  'expireLibraries,sendReminders,refreshIgTokens,cleanupOrphans,cleanupAnonymous,cleanupTokens,cleanupVisits'
).split(',');

async function run(task: string) {
  let processed = 0;
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${base}/api/cron/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-key': key },
      body: JSON.stringify({ task }),
    });
    const body = (await res.json()) as {
      processed?: number;
      more?: boolean;
      error?: { message: string };
    };
    if (!res.ok) throw new Error(`${task}: ${res.status} ${body.error?.message ?? ''}`);
    processed += body.processed ?? 0;
    if (!body.more) break;
  }
  console.log(`${task}: processed ${processed}`);
}

for (const t of tasks) await run(t.trim());
