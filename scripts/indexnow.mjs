#!/usr/bin/env node
/**
 * Tells IndexNow (Bing, Yandex, Seznam, ... and through Bing, ChatGPT search and Copilot) which
 * public URLs are new or changed since the previous deploy, by comparing <loc>/<lastmod> pairs.
 *
 *   node scripts/indexnow.mjs <old-sitemap.xml> <new-sitemap.xml>
 *
 * A missing or empty old sitemap submits every URL. Never fails the deploy: errors only warn.
 * The key file is app/public/<KEY>.txt.
 */
import { existsSync, readFileSync } from 'node:fs';

const KEY = 'fc6c3d2ba6d779d7831a9b2680ac6cf4';
const [oldFile, newFile] = process.argv.slice(2);

if (!newFile) {
  console.error('usage: indexnow.mjs <old-sitemap.xml> <new-sitemap.xml>');
  process.exit(2);
}

/** loc → lastmod for every <url> in a sitemap. */
function entries(file) {
  const xml = file && existsSync(file) ? readFileSync(file, 'utf8') : '';
  const out = new Map();
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(m[1])?.[1];
    if (loc) out.set(loc, /<lastmod>([^<]+)<\/lastmod>/.exec(m[1])?.[1] ?? '');
  }
  return out;
}

const before = entries(oldFile);
const after = entries(newFile);
const changed = [...after].filter(([loc, mod]) => before.get(loc) !== mod).map(([loc]) => loc);

if (!changed.length) {
  console.log('IndexNow: no new or changed URLs.');
  process.exit(0);
}

const host = new URL(changed[0]).host;
const body = {
  host,
  key: KEY,
  keyLocation: `https://${host}/${KEY}.txt`,
  urlList: changed,
};

try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  // 200 and 202 both mean accepted; 202 while the key is still being verified.
  const ok = res.status === 200 || res.status === 202;
  console.log(`IndexNow: ${res.status} for ${changed.length} URL(s)${ok ? '' : ' (not accepted)'}`);
  for (const u of changed) console.log(`  ${u}`);
} catch (err) {
  console.warn(`IndexNow: request failed (${err.message})`);
}
