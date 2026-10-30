// Bundles the TypeScript tests with esbuild and runs them with Node's built-in test runner.
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// `--dir tests/db` runs the database integration tests (needs `npm run db:start`).
const dirArg = process.argv.indexOf('--dir');
const testDir = dirArg > -1 ? process.argv[dirArg + 1] : 'tests';
const outdir = '.test-build';
const entryPoints = readdirSync(testDir)
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => `${testDir}/${f}`);

rmSync(outdir, { recursive: true, force: true });
await build({ entryPoints, outdir, bundle: true, platform: 'node', format: 'esm', outExtension: { '.js': '.mjs' }, logLevel: 'warning' });

const files = entryPoints.map((f) => `${outdir}/${f.slice(testDir.length + 1).replace(/\.ts$/, '.mjs')}`);
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(result.status ?? 1);
