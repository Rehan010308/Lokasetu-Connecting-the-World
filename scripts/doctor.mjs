#!/usr/bin/env node
/**
 * npm run doctor
 *
 * Finds source files that are in your folder but NOT part of this build.
 *
 * Why this exists: unzipping a new version over an old folder overwrites
 * changed files but never deletes removed ones. Next.js still routes to those
 * orphans, they import modules that no longer exist, and the result looks like
 * a broken app — blank labels, missing buttons, compile errors on pages you
 * did not even know were there.
 *
 * The repo's git index is the source of truth for what belongs.
 */

import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

const WATCHED = ['app/', 'components/', 'lib/', 'scripts/'];
const CODE = /\.(tsx?|jsx?|css)$/;

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
}

let strays = [];
try {
  strays = git('ls-files --others --exclude-standard')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((f) => WATCHED.some((w) => f.startsWith(w)) && CODE.test(f));
} catch {
  console.log('⚠️  Could not read the git index (is git installed, and is this the unzipped project?).');
  console.log('   If you are unsure the folder is clean, delete it and unzip fresh.');
  process.exit(0);
}

const WARN_ONLY = process.argv.includes('--warn');

if (strays.length === 0) {
  if (!WARN_ONLY) console.log('✅ No leftover files. Your folder matches this build exactly.');
  process.exit(0);
}

console.log(`\n⚠️  ${strays.length} file(s) here are not tracked by this build.\n`);
for (const f of strays) console.log('   ' + f);

console.log(`
If you just unzipped a new version over an old folder, these are leftovers from
the previous build. Next.js will still compile them, and they import modules
that no longer exist — which breaks pages that are otherwise fine.

   npm run doctor:fix     remove them

(If you added these files yourself, ignore this — it is only a warning.)
`);

if (process.argv.includes('--fix')) {
  for (const f of strays) {
    if (existsSync(f)) rmSync(f, { recursive: true, force: true });
  }
  // clear empty directories Next may still scan
  try { git('clean -fd app components lib'); } catch {}
  console.log(`\n🧹 Removed ${strays.length} leftover file(s). Now run: npm run dev`);
}

process.exit(WARN_ONLY ? 0 : strays.length ? 1 : 0);
