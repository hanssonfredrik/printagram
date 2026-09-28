/**
 * Creates the tables and the pdfs container and sets Blob CORS.
 * Works against Azurite (default) and against a real storage account:
 *
 *   npx tsx scripts/storage-setup.ts                           # Azurite
 *   STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=…" APP_ORIGINS="https://inbunden.com" npx tsx scripts/storage-setup.ts
 */
import { ensureContainer, PDF_CONTAINER, setBlobCors } from '../api/src/lib/blobs.js';
import { ensureTables } from '../api/src/lib/tables.js';

async function main() {
  const cs = process.env.STORAGE_CONNECTION_STRING ?? 'UseDevelopmentStorage=true';
  process.env.STORAGE_CONNECTION_STRING = cs;
  const origins = (process.env.APP_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(
    `storage-setup: ${cs === 'UseDevelopmentStorage=true' ? 'Azurite' : 'account ' + (cs.match(/AccountName=([^;]+)/)?.[1] ?? '?')}`,
  );
  await ensureTables();
  console.log('tables: Accounts, Photos, Lookups');
  await ensureContainer(PDF_CONTAINER);
  console.log(`container: ${PDF_CONTAINER}`);
  await setBlobCors(origins);
  console.log(`blob CORS: ${origins.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
