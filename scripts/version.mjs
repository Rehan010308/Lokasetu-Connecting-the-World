#!/usr/bin/env node
/**
 * npm run version:sync
 *
 * lib/version.ts is the single source of truth for the build number. This
 * copies it into the two other places that state it — package.json and the
 * README's "Current build" line — because a version written by hand in three
 * files is a version that is wrong in two of them.
 *
 * That is not hypothetical: the README said v4.1 while the app said v4.1.3, so
 * the GitHub front page announced a build nobody was running.
 *
 * `npm test` fails if these ever drift again.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const version = readFileSync('lib/version.ts', 'utf8').match(/VERSION = '([^']+)'/)?.[1];
if (!version) {
  console.error('Could not read VERSION from lib/version.ts');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
pkg.version = version;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

const readme = readFileSync('README.md', 'utf8');
writeFileSync('README.md', readme.replace(/\*\*Current build: v[\d.]+\*\*/, `**Current build: v${version}**`));

console.log(`version ${version} -> package.json, README.md`);
