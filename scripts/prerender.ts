/**
 * Prerenders the public pages (app/src/seo/routes.ts) into static HTML after `vite build`, so
 * search engines and AI crawlers that don't run JavaScript (GPTBot, ClaudeBot, PerplexityBot, …)
 * get the full page: text, title, canonical, hreflang and JSON-LD.
 *
 *   npm run build -w app && npm run prerender -w app
 *
 * - Serves app/dist locally and opens every public URL in headless Chromium.
 * - /api/config comes from the live site (PRERENDER_CONFIG_URL, default <site>/api/config) so
 *   prices and the test-mode pill match production; if it can't be reached the app falls back to
 *   its defaults. /api/me is always signed out.
 * - Writes dist/index.html for / and dist/pages/<path>.html for the rest, dist/app-shell.html (the untouched SPA shell with
 *   noindex, served by Static Web Apps for app routes and unknown URLs) and dist/llms.txt.
 * - Adds a rewrite per page to dist/staticwebapp.config.json (/about → /pages/about.html). A
 *   folder with an index.html would make Static Web Apps redirect /about to /about/, while the
 *   canonical URLs have no trailing slash.
 * - Fails if a page is missing its H1, canonical, hreflang or valid JSON-LD.
 */
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  absoluteUrl,
  allPublicPaths,
  DEFAULT_SITE_URL,
  GUIDE_KEYS,
  pathFor,
  type PageKey,
} from '../app/src/seo/routes';

const DIST = path.resolve(import.meta.dirname, '../app/dist');
const SITE = (process.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
const CONFIG_URL = process.env.PRERENDER_CONFIG_URL ?? `${SITE}/api/config`;
const NOINDEX = '<meta name="robots" content="noindex" />';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.icc': 'application/vnd.iccprofile',
};

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/** The SPA shell: dist/index.html as Vite built it (or recovered from app-shell.html on a rerun). */
function prepareShell(): string {
  const shellPath = path.join(DIST, 'app-shell.html');
  const source = existsSync(shellPath)
    ? readFileSync(shellPath, 'utf8').replace(`    ${NOINDEX}\n`, '')
    : readFileSync(path.join(DIST, 'index.html'), 'utf8');
  if (!source.includes('<div id="root"></div>')) {
    fail('dist/index.html is not the Vite shell. Run `npm run build -w app` first.');
  }
  const shell = source.replace(
    '<meta charset="UTF-8" />',
    `<meta charset="UTF-8" />\n    ${NOINDEX}`,
  );
  writeFileSync(shellPath, shell);
  return source;
}

/** Static files from dist; every page URL gets the shell, like Static Web Apps' fallback. */
function serve(shell: string): Promise<Server> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const file = path.join(DIST, decodeURIComponent(url.pathname));
    const ext = path.extname(file);
    if (ext && file.startsWith(DIST) && existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': TYPES[ext] ?? 'application/octet-stream' });
      res.end(readFileSync(file));
      return;
    }
    if (ext) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES['.html'] }).end(shell);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function liveConfig(): Promise<string | null> {
  try {
    const r = await fetch(CONFIG_URL, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    JSON.parse(text);
    console.log(`  config from ${CONFIG_URL}`);
    return text;
  } catch (e) {
    console.warn(`  ! could not load ${CONFIG_URL} (${(e as Error).message}); using app defaults`);
    return null;
  }
}

function check(html: string, where: string, lang: string) {
  const problems: string[] = [];
  if (!/<h1[\s>]/.test(html)) problems.push('no <h1>');
  if (!html.includes(`<html lang="${lang}"`)) problems.push(`<html lang> is not ${lang}`);
  if ((html.match(/rel="canonical"/g) ?? []).length !== 1)
    problems.push('not exactly one canonical');
  if ((html.match(/hreflang="/g) ?? []).length !== 3) problems.push('not 3 hreflang links');
  if (!html.includes('content="index, follow')) problems.push('no robots index');
  const ld = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (!ld) problems.push('no JSON-LD');
  else {
    try {
      JSON.parse(ld[1]!);
    } catch {
      problems.push('JSON-LD does not parse');
    }
  }
  if (problems.length) fail(`${where}: ${problems.join(', ')}`);
}

function llmsTxt(pages: Map<string, { title: string; description: string }>): string {
  const line = (key: PageKey, lang: 'en' | 'sv') => {
    const p = pathFor(key, lang);
    const m = pages.get(p)!;
    const title = m.title.replace(/ · Inbunden$/, '');
    return `- [${title}](${absoluteUrl(SITE, p)}): ${m.description}`;
  };
  const en = pages.get('/')!;
  return [
    '# Inbunden',
    '',
    `> ${en.description}`,
    '',
    'Inbunden is made in Sweden by Venueve AB (hello@inbunden.com). Photos come in through Instagram’s own login (Professional accounts), the Instagram data export ZIP (any account, including private ones) or the Google Photos picker; Inbunden never asks for a password. Output is a print-ready PDF (square 21 × 21 cm or portrait 21 × 28 cm, 4 mm bleed, sRGB) for one flat price per book. Printed softcover and hardcover books are coming soon. The site is in English and Swedish.',
    '',
    '## Pages',
    '',
    line('landing', 'en'),
    line('about', 'en'),
    line('guides', 'en'),
    '',
    '## Guides',
    '',
    ...GUIDE_KEYS.map((k) => line(k, 'en')),
    '',
    '## På svenska',
    '',
    line('landing', 'sv'),
    line('about', 'sv'),
    ...GUIDE_KEYS.map((k) => line(k, 'sv')),
    '',
    '## Optional',
    '',
    line('privacy', 'en'),
    line('terms', 'en'),
    '',
  ].join('\n');
}

/** Where a public page's HTML goes: / is index.html, /sv/om is pages/sv/om.html. */
function pageFile(p: string): string {
  return p === '/' ? 'index.html' : `pages${p}.html`;
}

/** Serve /about from pages/about.html without a redirect. */
function addRewrites() {
  const file = path.join(DIST, 'staticwebapp.config.json');
  const config = JSON.parse(readFileSync(file, 'utf8')) as { routes?: { route: string }[] };
  const pages = allPublicPaths()
    .filter(({ path: p }) => p !== '/')
    .map(({ path: p }) => ({ route: p, rewrite: `/${pageFile(p)}` }));
  const known = new Set(pages.map((r) => r.route));
  config.routes = [...pages, ...(config.routes ?? []).filter((r) => !known.has(r.route))];
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}

async function main() {
  if (!existsSync(DIST)) fail('app/dist is missing. Run `npm run build -w app` first.');
  const shell = prepareShell();
  const server = await serve(shell);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const config = await liveConfig();

  const browser = await chromium.launch();
  // en-US and nothing saved: the same view a crawler gets (no redirect to /sv).
  const ctx = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 900 } });
  await ctx.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/config' && config) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: config });
    }
    if (url.pathname === '/api/me') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: null, libraries: [] }),
      });
    }
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });

  const meta = new Map<string, { title: string; description: string }>();
  const errors: string[] = [];
  for (const { path: p, lang } of allPublicPaths()) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${p}: ${e.message}`));
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.waitForSelector('main h1');
    await page.waitForFunction(
      (l) =>
        document.documentElement.lang === l && !!document.querySelector('link[rel="canonical"]'),
      lang,
    );
    const html =
      '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML));
    check(html, p, lang);
    meta.set(p, {
      title: await page.title(),
      description: (await page.getAttribute('meta[name="description"]', 'content')) ?? '',
    });
    const out = path.join(DIST, pageFile(p));
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, html);
    console.log(`✓ ${p}`);
    await page.close();
  }
  await browser.close();
  server.close();
  if (errors.length) fail(`page errors:\n  ${errors.join('\n  ')}`);

  writeFileSync(path.join(DIST, 'llms.txt'), llmsTxt(meta));
  addRewrites();
  console.log(`✓ llms.txt, app-shell.html (${meta.size} pages prerendered for ${SITE})`);
}

main().catch((e) => fail(e instanceof Error ? (e.stack ?? e.message) : String(e)));
