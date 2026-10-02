/**
 * Browser end-to-end run with headless Chromium (Playwright):
 * upload a real export ZIP → select → preview/arrange → checkout (test payment) → done → PDF.
 * Also captures screenshots of every screen into docs/screenshots.
 *
 * Runs against the local stack started by start-local.ps1 (SWA CLI + Functions + Azurite):
 *   npx tsx scripts/e2e.ts                     # http://localhost:4280
 *   APP_URL=https://… npx tsx scripts/e2e.ts   # a deployed environment in test-payment mode
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';
import { PDFArray, PDFDocument, PDFName } from 'pdf-lib';

const APP = (process.env.APP_URL ?? 'http://localhost:4280').replace(/\/$/, '');
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
    // The UI follows the browser language; the checks below expect English.
    locale: 'en-US',
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

  await page.getByRole('button', { name: 'I have my ZIP - upload it' }).click();
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
  await page.getByText('5 photos selected').waitFor(); // 5 stills, carousels show all images by default
  await page.getByRole('button', { name: 'Carousels: all images' }).click();
  await page.getByText('3 photos selected').waitFor(); // carousel collapsed to first image
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
  await page.getByText('Title page').waitFor();
  await page.getByLabel('Next page').click();
  await page.getByText(/Page 1 of/).waitFor();
  await shot(page, '08-preview');
  // One photo per page, then back to the mixed layout.
  await page.getByRole('tab', { name: 'One' }).click();
  await page.getByText(/Page 1 of 5/).waitFor();
  await page.getByRole('tab', { name: 'Mixed' }).click();
  await page.getByRole('tab', { name: 'Arrange pages' }).click();
  await shot(page, '08b-arrange');
  await page.getByRole('tab', { name: 'Page by page' }).click();
  await page.getByLabel('Book title').fill('Fixture book · 2025');
  const footer = await page.getByText(/\d+ pages · Square/).innerText();
  const expectedPages = Number(/(\d+) pages/.exec(footer)![1]);
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByText('Choose a format').waitFor();
  await page.getByText('Test payment - no money is taken').waitFor();
  await shot(page, '09-checkout');
  ok(`preview: density, arrange, ${expectedPages} pages`);

  await page.getByPlaceholder('Email').fill(EMAIL);
  await page.getByPlaceholder('Create a password (8+ characters)').fill('hunter2hunter2');
  await page.getByLabel(/4000 0000 0000 0002/).check();
  await page.getByRole('button', { name: 'Place test order' }).click();
  await page
    .getByText(/declined/i)
    .first()
    .waitFor({ timeout: 20000 });
  ok('test decline card shows the reason');
  await page.getByLabel(/4242 4242 4242 4242/).check();
  await page.getByRole('button', { name: 'Place test order' }).click();
  await page.getByText('Your book is ready').waitFor({ timeout: 120000 });
  await shot(page, '10-done');
  ok('paid (test card) and PDF generated in the worker');

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
    doc.getPageCount() === expectedPages,
    `page count ${doc.getPageCount()} (preview said ${expectedPages})`,
  );
  const first = doc.getPage(0);
  const trim = first.getTrimBox();
  const media = first.getMediaBox();
  // 210 mm trim + 4 mm bleed on each side.
  assert(Math.round(trim.width) === 595 && Math.round(trim.height) === 595, `trim ${trim.width}`);
  assert(Math.round(media.width) === 618 && Math.round(trim.x) === 11, `media ${media.width}`);
  assert(doc.catalog.lookup(PDFName.of('OutputIntents'), PDFArray).size() === 1, 'OutputIntent');
  ok(`PDF: ${bytes.length} bytes, ${doc.getPageCount()} pages, 21×21 cm trim + 4 mm bleed, sRGB`);

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
  ok('delete confirmation');

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

  // Multi-part export in a fresh session: both parts dropped together, with a HEIC photo,
  // a post whose file is in neither part, and an archived post added on request.
  {
    const ctx2 = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
    });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await p2.goto(APP + '/export/upload');
    await p2.getByText('Drop the ZIP here').waitFor();
    await p2.setInputFiles('input[type=file]', [
      path.resolve('fixtures/instagram-multi-part-2.zip'),
      path.resolve('fixtures/instagram-multi-part-1.zip'),
    ]);
    await p2.getByText('Found 2 photos from 2024').waitFor({ timeout: 60000 });
    const notes = await p2.getByText(/Of the photos in your export/).innerText();
    assert(/1 is in a part of the export/.test(notes), `missing note: ${notes}`);
    assert(/1 uses a format we can't print/.test(notes), `unsupported note: ${notes}`);
    await shot(p2, '06b-upload-multipart');
    await p2.getByRole('button', { name: 'Add it too' }).click();
    await p2.getByText('Added 1 new photo').waitFor({ timeout: 60000 });
    await ctx2.close();
    ok('multi-part export: both parts read, missing + HEIC reported, archived post added');
  }

  // Swedish browser: the UI follows it, and the picker switches back to English for good.
  {
    const ctx3 = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: 'sv-SE',
    });
    const p3 = await ctx3.newPage();
    p3.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    await p3.goto(APP + '/');
    await p3.getByText('Ditt Instagram som en riktig bok.').waitFor();
    assert((await p3.getAttribute('html', 'lang')) === 'sv', 'html lang is sv');
    await shot(p3, '15-landing-swedish');
    await p3.getByRole('combobox', { name: 'Språk' }).first().selectOption('en');
    await p3.getByText('Your Instagram, as a real book.').waitFor();
    await p3.reload();
    await p3.getByText('Your Instagram, as a real book.').waitFor();
    await ctx3.close();
    ok('Swedish browser gets Swedish; the language choice is remembered');
  }

  const real = errors.filter(
    (e) =>
      // 402 is the intended response to the decline test card.
      !/favicon|Download the React DevTools|fonts.googleapis|ERR_INTERNET_DISCONNECTED|net::ERR|status of 402/.test(
        e,
      ),
  );
  if (real.length) {
    console.log('console errors:\n' + real.join('\n'));
  }
  assert(real.length === 0, 'no page/console errors');
  writeFileSync(
    path.join(shots, 'README.md'),
    '# Screenshots\n\nGenerated by `npx tsx scripts/e2e.ts` against the local stack (start-local.ps1).\n',
  );
  await browser.close();
  console.log('\nE2E passed.');
}

main().catch((e) => {
  console.error('\n✗', e.message);
  process.exit(1);
});
