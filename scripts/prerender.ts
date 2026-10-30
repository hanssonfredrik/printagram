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
 * - Writes dist/index.html for / and dist/pages/<path>.html for the rest, dist/app-shell.html (the
 *   untouched SPA shell with noindex, served for the app routes), dist/404.html (the not-found
 *   page), dist/llms.txt and dist/llms-full.txt (every public page as Markdown), and the share
 *   images: og-image-<lang>.jpg (the landing page) and one card per guide and language.
 * - Sends URLs with a trailing slash (/about/) to the canonical one with a 301 (trailingSlash: never).
 * - Rewrites dist/staticwebapp.config.json: a rewrite per page (/about → /pages/about.html; a
 *   folder with an index.html would make Static Web Apps redirect /about to /about/, while the
 *   canonical URLs have no trailing slash), the shell for each app route (APP_ROUTES), and a real
 *   404 status for everything else instead of the SPA fallback's soft 404.
 * - Fails if a page is missing its H1, canonical, hreflang or valid JSON-LD, or if two pages
 *   share a title or description.
 */
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  absoluteUrl,
  allPublicPaths,
  APP_ROUTES,
  DEFAULT_SITE_URL,
  GUIDE_KEYS,
  ogImagePath,
  PAGE_KEYS,
  pathFor,
  type PageKey,
} from '../app/src/seo/routes';
import {
  currencyForLang,
  DEFAULT_PRICING,
  fmtMoney,
  normalizePricing,
  pdfPriceCents,
  type AppConfig,
} from '../shared/src/index';

/** Must match CONFIG_SCRIPT_ID in app/src/state/session.ts. */
const CONFIG_SCRIPT_ID = 'inbunden-config';

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
  if ((html.match(/rel="alternate" hreflang="/g) ?? []).length !== 3)
    problems.push('not 3 hreflang links');
  if (!html.includes('content="index, follow')) problems.push('no robots index');
  if (!/<title>[^<]{10,}<\/title>/.test(html)) problems.push('no <title>');
  if (!/<meta name="description" content="[^"]{50,}"/.test(html))
    problems.push('no meta description');
  if (!html.includes('property="og:image"')) problems.push('no og:image');
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ];
  if (!blocks.length) problems.push('no JSON-LD');
  for (const ld of blocks) {
    try {
      JSON.parse(ld[1]!);
    } catch {
      problems.push('JSON-LD does not parse');
    }
  }
  if (problems.length) fail(`${where}: ${problems.join(', ')}`);
}

interface PageInfo {
  title: string;
  description: string;
  markdown: string;
}

/** The short facts paragraph for llms.txt, from the same config the pages were rendered with. */
function facts(cfg: AppConfig): string {
  const pricing = normalizePricing(cfg.pricing ?? DEFAULT_PRICING);
  const price = (lang: 'en' | 'sv') =>
    fmtMoney(pdfPriceCents(pricing, currencyForLang(lang)), currencyForLang(lang), lang);
  const sources = [
    'the Instagram data export ZIP (any account, including private ones)',
    ...(cfg.googlePhotosEnabled ? ['the Google Photos picker'] : []),
    ...(cfg.connectEnabled ? ['a direct Instagram connection'] : []),
  ];
  return [
    `Inbunden is a web service made in Sweden by Venueve AB (hello@inbunden.com) that turns Instagram posts into a print-ready photo book PDF.`,
    `Photos come in through ${sources.join(' or ')}.`,
    cfg.connectEnabled ? '' : 'Connecting an Instagram account directly is coming soon.',
    `Inbunden never asks for your Instagram or Google password.`,
    `The PDF costs ${price('en')} per book (${price('sv')} on the Swedish site), whatever the number of pages, with no subscription.`,
    `It is square 21 × 21 cm or portrait 21 × 28 cm, with 4 mm bleed, a trim box, original photos embedded and an sRGB output intent, and holds up to 999 photos.`,
    cfg.printedBooksEnabled ? '' : 'Printed softcover and hardcover books are coming soon.',
    'The site is in English and Swedish.',
  ]
    .filter(Boolean)
    .join(' ');
}

function llmsTxt(pages: Map<string, PageInfo>, cfg: AppConfig): string {
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
    facts(cfg),
    '',
    `The full text of every page is in ${absoluteUrl(SITE, '/llms-full.txt')}.`,
    '',
    '## When Inbunden fits',
    '',
    '- The photos are on Instagram and the person wants them in a book in date order, with captions, without placing every photo by hand.',
    '- The Instagram account is private or personal, so services that connect to Instagram directly (Creator or Business accounts only) do not work.',
    '- The person wants a print-ready PDF they own and can print anywhere, or has many photos (the price does not depend on the number of pages).',
    '- The person is deleting their Instagram account and wants a keepsake of the photos.',
    '',
    '## When another service fits better',
    '',
    ...(cfg.printedBooksEnabled
      ? []
      : [
          '- The person wants a printed book delivered to the door. Inbunden sells the PDF; printed books are coming soon.',
        ]),
    '- The best photos are on the phone or camera rather than Instagram: original files print sharper.',
    '- The person wants a very small or special format, such as a 13 × 13 cm gift book.',
    '',
    '## Pages',
    '',
    line('landing', 'en'),
    line('pricing', 'en'),
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
    line('pricing', 'sv'),
    line('about', 'sv'),
    line('guides', 'sv'),
    ...GUIDE_KEYS.map((k) => line(k, 'sv')),
    '',
    '## Optional',
    '',
    line('privacy', 'en'),
    line('terms', 'en'),
    line('privacy', 'sv'),
    line('terms', 'sv'),
    '',
  ].join('\n');
}

/** Every public page's main content as Markdown, English first, for AI assistants. */
function llmsFullTxt(pages: Map<string, PageInfo>, cfg: AppConfig): string {
  const order = (['en', 'sv'] as const).flatMap((lang) => PAGE_KEYS.map((k) => pathFor(k, lang)));
  return [
    '# Inbunden: full text',
    '',
    `> ${facts(cfg)}`,
    '',
    ...order.flatMap((p) => {
      const m = pages.get(p)!;
      return ['---', '', `Source: ${absoluteUrl(SITE, p)}`, '', m.markdown.trim(), ''];
    }),
  ].join('\n');
}

/**
 * Runs in the page: puts an empty comment between adjacent text nodes in #root, as React's own
 * server rendering does. Serialized HTML would otherwise merge "Venueve AB" and " · " into one
 * text node, and hydration would fail on the mismatch.
 */
function separateTextNodes() {
  const walker = document.createTreeWalker(document.getElementById('root')!, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  for (const t of texts) {
    if (t.previousSibling?.nodeType === Node.TEXT_NODE) {
      t.parentNode!.insertBefore(document.createComment(' '), t);
    }
  }
}

/** Runs in the page: <main> as simple Markdown (headings, paragraphs, lists, tables, facts). */
function mainAsMarkdown(): string {
  const out: string[] = [];
  const text = (el: Element) => (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim();
  const walk = (el: Element) => {
    if (el.closest('[aria-hidden="true"]') || el.tagName === 'BUTTON') return;
    const tag = el.tagName;
    const h = /^H([1-6])$/.exec(tag);
    if (h) return void out.push(`${'#'.repeat(Number(h[1]))} ${text(el)}`, '');
    if (tag === 'P') return void (text(el) && out.push(text(el), ''));
    if (tag === 'UL' || tag === 'OL') {
      [...el.children].forEach((li, i) =>
        out.push(`${tag === 'OL' ? `${i + 1}.` : '-'} ${text(li)}`),
      );
      return void out.push('');
    }
    if (tag === 'DL') {
      el.querySelectorAll('dt').forEach((dt) =>
        out.push(`- ${text(dt)}: ${dt.nextElementSibling ? text(dt.nextElementSibling) : ''}`),
      );
      return void out.push('');
    }
    if (tag === 'TABLE') {
      const rows = [...el.querySelectorAll('tr')].map(
        (tr) => `| ${[...tr.children].map((c) => text(c).replace(/\|/g, '/')).join(' | ')} |`,
      );
      if (rows.length) {
        const cols = el.querySelector('tr')!.children.length;
        rows.splice(1, 0, `|${' --- |'.repeat(cols)}`);
      }
      return void out.push(...rows, '');
    }
    // Text in plain elements (price cards, notes): one line each.
    if (!el.children.length) return void (text(el) && out.push(text(el), ''));
    [...el.children].forEach(walk);
  };
  walk(document.querySelector('main')!);
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Embeds the config the page was rendered with, so the browser's first render matches the HTML
 * and React can hydrate it (app/src/state/session.ts reads it back).
 */
function withConfig(html: string, config: string | null): string {
  if (!config) return html;
  const json = config.replace(/</g, '\\u003c');
  return html.replace(
    '</body>',
    `<script id="${CONFIG_SCRIPT_ID}" type="application/json">${json}</script></body>`,
  );
}

/** Where a public page's HTML goes: / is index.html, /sv/om is pages/sv/om.html. */
function pageFile(p: string): string {
  return p === '/' ? 'index.html' : `pages${p}.html`;
}

interface SwaConfig {
  routes?: { route: string }[];
  navigationFallback?: unknown;
  responseOverrides?: Record<string, unknown>;
  trailingSlash?: 'always' | 'never' | 'auto';
}

/**
 * Serve /about from pages/about.html without a redirect, the app routes from the noindexed shell,
 * and everything else as a real 404 with the not-found page. Without this step (dev, tests) the
 * checked-in config's SPA fallback still serves every URL.
 */
function rewriteConfig() {
  const file = path.join(DIST, 'staticwebapp.config.json');
  const config = JSON.parse(readFileSync(file, 'utf8')) as SwaConfig;
  const pages = allPublicPaths()
    .filter(({ path: p }) => p !== '/')
    .map(({ path: p }) => ({ route: p, rewrite: `/${pageFile(p)}` }));
  const app = APP_ROUTES.map((route) => ({ route, rewrite: '/app-shell.html' }));
  // Static Web Apps answers /index.html with a 301 to /index, which would be a 200 copy of /.
  const index = [{ route: '/index', redirect: '/', statusCode: 301 }];
  const known = new Set([...pages, ...app, ...index].map((r) => r.route));
  config.routes = [
    ...pages,
    ...app,
    ...index,
    ...(config.routes ?? []).filter((r) => !known.has(r.route)),
  ];
  // /about/ and /sv/om/ are not canonical. Static Web Apps treats /sv and /sv/ as the same route,
  // so per-page redirect rules are rejected as duplicates; its own setting sends the 301 instead.
  // The pages are single files, never folders, so nothing redirects the other way.
  config.trailingSlash = 'never';
  delete config.navigationFallback;
  config.responseOverrides = {
    ...config.responseOverrides,
    '404': { rewrite: '/404.html', statusCode: 404 },
  };
  writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * Runs in the page after its HTML was captured: replaces the body with a 1200 × 630 share card.
 * Uses the stylesheet already loaded (tokens, fonts), so the card matches the site.
 */
function ogCard(card: { title: string; kicker: string; description: string }) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const size = card.title.length > 70 ? 48 : card.title.length > 48 ? 56 : 64;
  document.documentElement.style.cssText = 'background:#faf7f2;overflow:hidden';
  document.body.style.cssText = 'margin:0;background:#faf7f2';
  document.body.innerHTML = `
    <div style="box-sizing:border-box;width:1200px;height:630px;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;background:#faf7f2;color:#2a2622;font-family:'Albert Sans',Helvetica,Arial,sans-serif">
      <div style="display:flex;align-items:center;gap:14px;font-size:26px;font-weight:500;color:#6f675e">
        <img src="/logo.svg" alt="" width="40" height="40" />
        <span style="color:#2a2622;font-weight:600">Inbunden</span>
        <span>${esc(card.kicker)}</span>
      </div>
      <div style="font-family:'Lora',Georgia,serif;font-size:${size}px;line-height:1.15;letter-spacing:-0.01em;text-wrap:balance;max-width:1000px">${esc(card.title)}</div>
      <div style="font-size:26px;line-height:1.4;color:#6f675e;max-width:1000px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(card.description)}</div>
      <div style="height:8px;width:160px;border-radius:999px;background:#4a5fa8"></div>
    </div>`;
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
  // tsx keeps function names with a __name() helper, which functions passed to page.evaluate need.
  await ctx.addInitScript({ content: 'window.__name = (f) => f;' });
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

  const cfg: AppConfig = config
    ? (JSON.parse(config) as AppConfig)
    : ({
        pricing: DEFAULT_PRICING,
        googlePhotosEnabled: false,
        connectEnabled: false,
      } as AppConfig);
  const meta = new Map<string, PageInfo>();
  const errors: string[] = [];
  for (const { key, path: p, lang } of allPublicPaths()) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${p}: ${e.message}`));
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.waitForSelector('main h1');
    await page.waitForFunction(
      (l) =>
        document.documentElement.lang === l && !!document.querySelector('link[rel="canonical"]'),
      lang,
    );
    await page.evaluate(separateTextNodes);
    const html = withConfig(
      '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML)),
      config,
    );
    check(html, p, lang);
    meta.set(p, {
      title: await page.title(),
      description: (await page.getAttribute('meta[name="description"]', 'content')) ?? '',
      markdown: await page.evaluate(mainAsMarkdown),
    });
    const out = path.join(DIST, pageFile(p));
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, html);
    if (GUIDE_KEYS.includes(key as (typeof GUIDE_KEYS)[number])) {
      // The guide's share image: a card with its title, drawn with the page's own fonts and colours.
      await page.setViewportSize({ width: 1200, height: 630 });
      await page.evaluate(ogCard, {
        title: meta.get(p)!.title.replace(/ · Inbunden$/, ''),
        kicker: lang === 'sv' ? 'Guide · inbunden.com' : 'Guide · inbunden.com',
        description: meta.get(p)!.description,
      });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: path.join(DIST, ogImagePath(lang, key).slice(1)),
        type: 'jpeg',
        quality: 85,
      });
    }
    if (key === 'landing') {
      // The share image: the top of this landing page, so it always shows the current copy and price.
      await page.addStyleTag({ content: '[role="region"] { display: none !important; }' });
      await page.setViewportSize({ width: 1200, height: 630 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(DIST, ogImagePath(lang).slice(1)),
        type: 'jpeg',
        quality: 85,
      });
    }
    console.log(`✓ ${p}`);
    await page.close();
  }
  // The not-found page, served with a 404 status for unknown URLs (rewriteConfig).
  // A fresh context: the pages above saved Swedish as the chosen language.
  const ctx404 = await browser.newContext({ locale: 'en-US' });
  await ctx404.addInitScript({ content: 'window.__name = (f) => f;' });
  await ctx404.route('**/api/**', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  const notFound = await ctx404.newPage();
  notFound.on('pageerror', (e) => errors.push(`404: ${e.message}`));
  await notFound.goto(`${base}/this-page-does-not-exist`, { waitUntil: 'networkidle' });
  await notFound.waitForSelector('main h1');
  const html404 =
    '<!doctype html>\n' + (await notFound.evaluate(() => document.documentElement.outerHTML));
  if (!html404.includes('content="noindex"')) fail('404 page: no noindex');
  writeFileSync(path.join(DIST, '404.html'), html404);
  await notFound.close();

  await browser.close();
  server.close();
  if (errors.length) fail(`page errors:\n  ${errors.join('\n  ')}`);

  for (const field of ['title', 'description'] as const) {
    const seen = new Map<string, string>();
    for (const [p, m] of meta) {
      const other = seen.get(m[field]);
      if (other) fail(`${p} and ${other} share the same ${field}`);
      seen.set(m[field], p);
    }
  }

  writeFileSync(path.join(DIST, 'llms.txt'), llmsTxt(meta, cfg));
  writeFileSync(path.join(DIST, 'llms-full.txt'), llmsFullTxt(meta, cfg));
  rewriteConfig();
  console.log(
    `✓ llms.txt, llms-full.txt, 404.html, app-shell.html (${meta.size} pages prerendered for ${SITE})`,
  );
}

main().catch((e) => fail(e instanceof Error ? (e.stack ?? e.message) : String(e)));
