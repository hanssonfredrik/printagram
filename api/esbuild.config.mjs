import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: [path.join(here, 'src/index.ts')],
  outfile: path.join(here, 'dist/index.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  minify: false,
  logLevel: 'info',
  // Kept external: installed from api/package.json at deploy time. Everything else
  // (including @printagram/shared) is inlined so the deployed package is self-contained.
  external: [
    '@azure/functions',
    '@azure/data-tables',
    '@azure/storage-blob',
    'jimp',
    'jose',
    'stripe',
    'ulid',
  ],
  alias: { '@printagram/shared': path.join(here, '../shared/src/index.ts') },
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('esbuild: watching api/src…');
} else {
  await build(options);
}
