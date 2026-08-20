#!/usr/bin/env node
/**
 * One version number, three places.
 *
 * `lib/version.ts` is the source of truth. This copies it into package.json
 * and into the README badge line, and `npm test` fails if they ever disagree —
 * so what the app prints on screen is always what the README claims.
 *
 *   node scripts/version.mjs         check, and fix package.json + README
 *   node scripts/version.mjs --check exit 1 if they disagree, change nothing
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const versionTs = readFileSync(join(root, 'lib/version.ts'), 'utf8');
const match = versionTs.match(/VERSION\s*=\s*'([^']+)'/);
if (!match) {
  console.error('lib/version.ts does not export a VERSION string.');
  process.exit(1);
}
const version = match[1];

let changed = false;

// package.json
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
if (pkg.version !== version) {
  if (checkOnly) {
    console.error(`package.json says ${pkg.version}, lib/version.ts says ${version}`);
    process.exit(1);
  }
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  changed = true;
}

// README
const readmePath = join(root, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const updated = readme.replace(/\*\*Current build: v[^*]+\*\*/, `**Current build: v${version}**`);
if (updated !== readme) {
  if (checkOnly) {
    console.error(`README.md does not say v${version}`);
    process.exit(1);
  }
  writeFileSync(readmePath, updated);
  changed = true;
}

console.log(changed ? `Synced everything to v${version}` : `Everything already says v${version}`);
