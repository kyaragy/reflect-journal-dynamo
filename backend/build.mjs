import { build } from 'esbuild';

await build({
  entryPoints: ['backend/src/functions/api/handler.ts'],
  outfile: 'backend/dist/functions/api/handler.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  sourcesContent: false,
  logLevel: 'info',
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
