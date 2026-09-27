#!/usr/bin/env node
/**
 * Waits until a TCP port accepts connections or a URL answers 2xx, then optionally opens a browser.
 *
 *   node scripts/wait-for.mjs tcp:127.0.0.1:10002
 *   node scripts/wait-for.mjs file:api/dist/index.js
 *   node scripts/wait-for.mjs http://localhost:4280/api/health --open http://localhost:4280
 *   --timeout <seconds>   (default 180)
 */
import net from 'node:net';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';

const args = process.argv.slice(2);
const target = args[0];
const openIdx = args.indexOf('--open');
const openUrl = openIdx >= 0 ? args[openIdx + 1] : null;
const tIdx = args.indexOf('--timeout');
const timeoutMs = (tIdx >= 0 ? Number(args[tIdx + 1]) : 180) * 1000;

if (!target) {
  console.error(
    'usage: wait-for.mjs tcp:host:port | file:path | http(s)://url [--open url] [--timeout s]',
  );
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tcpReady(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function httpReady(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

const started = Date.now();
let ready = false;
while (Date.now() - started < timeoutMs) {
  if (target.startsWith('file:')) {
    ready = existsSync(target.slice(5));
  } else if (target.startsWith('tcp:')) {
    const [, host, port] = target.split(':');
    ready = await tcpReady(host, Number(port));
  } else {
    ready = await httpReady(target);
  }
  if (ready) break;
  await sleep(1000);
}

if (!ready) {
  console.error(`Timed out waiting for ${target}`);
  process.exit(1);
}
console.log(`ready: ${target} (${Math.round((Date.now() - started) / 1000)} s)`);

if (openUrl) {
  const cmd =
    process.platform === 'win32'
      ? `start "" "${openUrl}"`
      : process.platform === 'darwin'
        ? `open "${openUrl}"`
        : `xdg-open "${openUrl}"`;
  exec(cmd);
  console.log(`\n  Inbunden is running at ${openUrl}\n  Press Ctrl+C to stop everything.\n`);
}
