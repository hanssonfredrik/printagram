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
  // Kept external: installed from admin/api/package.json at deploy time. The shared data layer
  // (api/src/lib, via src/core.ts) and @printagram/shared are inlined.
  external: ['@azure/functions', '@azure/data-tables', '@azure/storage-blob', 'jose', 'ulid'],
  alias: { '@printagram/shared': path.join(here, '../../shared/src/index.ts') },
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('esbuild: watching admin/api/src…');
} else {
  await build(options);
}
