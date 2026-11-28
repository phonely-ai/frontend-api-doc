#!/usr/bin/env node
/**
 * Docs name only the phonely.ai hosts that customers use.
 *
 * The docs are written for people using Phonely at app.phonely.ai. Source code
 * that pages are verified against also names other deployments, so a host
 * outside this set in a tracked docs file is almost always a leak.
 *
 * The synced API reference spec is checked against the db-svc release instead
 * (scripts/sync-v1-openapi.mjs --check), so it is excluded here.
 *
 * Usage: node scripts/check-public-hosts.mjs   (exit 1 on any other host)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PUBLIC_HOSTS = new Set([
  'phonely.ai',
  'www.phonely.ai',
  'app.phonely.ai',
  'docs.phonely.ai',
  'api.us.phonely.ai',
  'mcp.phonely.ai',
  'db.phonely.ai', // Web SDK endpoint
]);
const EXCLUDED = new Set(['api-reference/v1/openapi.json']);
const CHECKED = /\.(mdx?|json)$/;
const HOST = /(?:[a-z0-9-]+\.)*phonely\.ai\b/gi;

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter((path) => CHECKED.test(path) && !EXCLUDED.has(path));

const failures = [];
for (const path of files) {
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, index) => {
    for (const [match] of line.matchAll(HOST)) {
      const host = match.toLowerCase();
      if (!PUBLIC_HOSTS.has(host)) failures.push(`${path}:${index + 1}: ${host}`);
    }
  });
}

if (failures.length) {
  console.error('Docs name phonely.ai hosts that customers do not use:');
  for (const failure of failures) console.error('  ' + failure);
  console.error('Document the app.phonely.ai product only (see skill.md, Audience And Voice).');
  process.exit(1);
}
console.log(`Public hosts: ${files.length} files checked.`);
