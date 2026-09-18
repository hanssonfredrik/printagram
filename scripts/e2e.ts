/**
 * Browser end-to-end run with headless Chromium (Playwright):
 * upload a real export ZIP → select → preview → checkout (mock pay) → done → download PDF.
 * Also captures screenshots of every screen into docs/screenshots.
 *
 *   APP_URL=http://localhost:5173 npx tsx scripts/e2e.ts        # mock mode (Vite dev)
 *   APP_URL=http://localhost:4280 npx tsx scripts/e2e.ts        # full stack (SWA CLI + Functions + Azurite)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { PDFDocument } from 'pdf-lib';

const APP = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const shots = path.resolve('docs/screenshots');
mkdirSync(shots, { recursive: true });
const fixture = path.resolve('fixtures/instagram-fixture.zip');
// Unique per run: in full-stack mode accounts persist in Azurite between runs.
const EMAIL = `mara+${Date.now()}@example.com`;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true,
  });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  const ok = (s: string) => console.log(`✓ ${s}`);

  await page.goto(APP + '/');
  await page.getByText('Your Instagram, as a real book.').waitFor();
  await shot(page, '01-landing');
  ok('landing');

  await page.getByRole('button', { name: 'Start your book' }).first().click();
  await page.getByText('Bring in your photos').waitFor();
  await shot(page, '02-choose-source');
  await page.getByRole('button', { name: 'Show me how' }).click();
  await page.getByText('Get your photos from Instagram').waitFor();
  await shot(page, '03-export-guide');
  await page.getByRole('button', { name: "I've requested my export" }).click();
  await page.getByText('Instagram is preparing your photos').waitFor();
  await page.getByPlaceholder('you@example.com').fill(EMAIL);
  await page.getByRole('button', { name: 'Send link' }).click();
  await page.getByText(`Link sent to ${EMAIL}`).waitFor();
  await shot(page, '04-waiting');
  ok('export guide + return link');

  await page.getByRole('button', { name: 'I have my ZIP — upload it' }).click();
  await page.getByText('Drop the ZIP here').waitFor();
  await shot(page, '05-upload');

  // Error paths with real ZIPs
  await page.setInputFiles('input[type=file]', path.resolve('fixtures/instagram-html.zip'));
  await page.getByText('This export is in HTML format').waitFor({ timeout: 20000 });
  await shot(page, '05b-upload-error-html');
  await page.setInputFiles('input[type=file]', path.resolve('fixtures/instagram-empty.zip'));
  await page.getByText('No posts in this export').waitFor({ timeout: 20000 });
  ok('upload error states (html, empty)');

  // Real import through the Web Worker
  await page.setInputFiles('input[type=file]', fixture);
  await page.getByText(/Found 5 photos from 2025/).waitFor({ timeout: 60000 });
  const found = await page.getByText(/posts · \d+ carousels · \d+ videos skipped/).innerText();
  assert(
    found.includes('4 posts') && found.includes('1 carousels') && found.includes('1 videos'),
    `summary: ${found}`,
  );
  await shot(page, '06-upload-done');
  ok(`import: ${found}`);

  await page.getByRole('button', { name: 'Choose photos' }).click();
  await page.getByText('Choose your photos').waitFor();
  await page.getByText('3 photos selected').waitFor(); // 5 stills, carousel collapsed to first image → 3
  await page.getByRole('button', { name: 'Carousels: first image' }).click();
  await page.getByText('5 photos selected').waitFor();
  // mojibake caption decoded?
  const captionTile = page.getByRole('button', { name: /Vår i Göteborg/ });
  assert((await captionTile.count()) === 1, 'mojibake caption decoded in tile label');
  await shot(page, '07-select');
  ok('select: counts, carousel filter, decoded caption');

  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Preview your book').waitFor();
  await page.getByText('Cover', { exact: true }).waitFor();
  await page.getByLabel('Next page').click();
  await page.getByLabel('Next page').click();
  await page.getByText('Page 2 of').waitFor();
  await shot(page, '08-preview');
  await page.getByLabel('Book title').fill('Fixture book · 2025');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByText('Choose a format').waitFor();
  await shot(page, '09-checkout');
  ok('preview');

  await page.getByPlaceholder('Card number').fill('4242 4242 4242 4242');
  await page.getByPlaceholder('MM / YY').fill('12/30');
  await page.getByPlaceholder('CVC').fill('123');
  await page.getByPlaceholder('Name on card').fill('Mara Linde');
  await page.getByPlaceholder('Email').fill(EMAIL);
  await page.getByPlaceholder('Create a password (8+ characters)').fill('hunter2hunter2');
  await page.getByRole('button', { name: /^Pay €9/ }).click();
  await page.getByText('Your book is ready').waitFor({ timeout: 120000 });
  await shot(page, '10-done');
  ok('paid (mock) and PDF generated in the worker');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download your PDF' }).click(),
  ]);
  const file = path.join(shots, 'fixture-book.pdf');
  await download.saveAs(file);
  const bytes = readFileSync(file);
  assert(bytes.subarray(0, 5).toString() === '%PDF-', 'pdf header');
  const doc = await PDFDocument.load(bytes);
  assert(
    doc.getPageCount() === 6,
    `page count ${doc.getPageCount()} (expected cover+title+3 photo pages+back)`,
  );
  const { width, height } = doc.getPage(0).getSize();
  assert(Math.round(width) === 595 && Math.round(height) === 595, `page size ${width}x${height}`);
  ok(`PDF: ${bytes.length} bytes, ${doc.getPageCount()} pages, 21×21 cm`);

  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByText('Link copied').waitFor();
  await page.getByRole('link', { name: 'My books' }).click();
  await page.getByText('Your photo library').waitFor();
  await page.getByText('Fixture book · 2025').waitFor();
  await shot(page, '11-my-books');
  ok('my books lists the ordered book');

  await page.getByRole('button', { name: 'Delete photos now' }).click();
  await page.getByText(/Delete 5 photos and/).waitFor();
  await page.getByRole('button', { name: 'Keep my photos' }).click();
  await page.getByRole('button', { name: 'Reminder email' }).click();
  await page.getByText('Your photos are deleted in 7 days').waitFor();
  await shot(page, '12-reminder-email');
  ok('delete confirmation + reminder email preview');

  // Phone width
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(APP + '/');
  await page.getByText('Your Instagram, as a real book.').waitFor();
  await shot(page, '13-landing-phone');
  await page.goto(APP + '/select');
  await page.getByText('Choose your photos').waitFor();
  await shot(page, '14-select-phone');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  assert(!overflow, 'no horizontal scroll at phone width');
  ok('phone width renders without horizontal scroll');

  const real = errors.filter(
    (e) =>
      !/favicon|Download the React DevTools|fonts.googleapis|ERR_INTERNET_DISCONNECTED|net::ERR/.test(
        e,
      ),
  );
  if (real.length) {
    console.log('console errors:\n' + real.join('\n'));
  }
  assert(real.length === 0, 'no page/console errors');
  writeFileSync(
    path.join(shots, 'README.md'),
    '# Screenshots\n\nGenerated by `npx tsx scripts/e2e.ts` against the mock-mode dev server.\n',
  );
  await browser.close();
  console.log('\nE2E passed.');
}

main().catch((e) => {
  console.error('\n✗', e.message);
  process.exit(1);
});
