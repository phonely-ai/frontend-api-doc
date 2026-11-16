#!/usr/bin/env node
/**
 * Keep the API v1 reference equal to the contract db-svc releases.
 *
 * db-svc generates and commits `openapi/v1.json`; this script is the only
 * writer of its copy here, `api-reference/v1/openapi.json`, from which
 * Mintlify builds the endpoint pages. Its one change is presentation: a
 * "Beta" badge on each operation db-svc marks `x-stability-level: beta`.
 *
 * Usage:
 *   node scripts/sync-v1-openapi.mjs <source> --release <tag> --commit <sha>
 *   node scripts/sync-v1-openapi.mjs --check [source]
 *
 * Take the source from the commit confirmed serving production, never latest/main:
 *   git -C ../phonely-db-svc show <commit>:openapi/v1.json > /tmp/v1.json
 *   node scripts/sync-v1-openapi.mjs /tmp/v1.json --release v0.231.1 --commit <sha>
 *
 * `--check` validates formatting, badges and recorded provenance without a network.
 * `--check <source>` additionally compares the complete output with the upstream
 * file fetched at the recorded commit. The API updater must run that stronger check.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const COPY = 'api-reference/v1/openapi.json';
export const SOURCE = 'api-reference/v1/source.json';
const REPOSITORY = 'phonely-ai/phonely-db-svc';
const HTTP_METHODS = new Set(['get', 'put', 'post', 'patch', 'delete', 'options', 'head', 'trace']);

function contract(spec) {
  if (!spec || !/^3\./.test(spec.openapi ?? '') || !spec.paths || !Object.keys(spec.paths).length ||
      !Object.keys(spec.paths).every((path) => path.startsWith('/v1/'))) {
    throw new Error('Expected db-svc’s customer /v1 OpenAPI document.');
  }
  const copy = structuredClone(spec);
  for (const pathItem of Object.values(copy.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue;
      delete operation['x-mint'];
    }
  }
  return copy;
}

/** The one allowed transformation of the generated customer contract. */
export function render(spec) {
  const copy = contract(spec);
  for (const pathItem of Object.values(copy.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue;
      if (operation['x-stability-level'] === 'beta') {
        operation['x-mint'] = { metadata: { tag: 'Beta' } };
      }
    }
  }
  return `${JSON.stringify(copy, null, 2)}\n`;
}

export function contractHash(spec) {
  return createHash('sha256').update(JSON.stringify(contract(spec))).digest('hex');
}

export function sourceRecord(spec, release, commit) {
  if (!/^v\d+\.\d+\.\d+$/.test(release ?? '') || !/^[a-f0-9]{40}$/.test(commit ?? '')) {
    throw new Error('A production release tag and its full immutable commit are required.');
  }
  return { schemaVersion: 1, repository: REPOSITORY, release, commit, contractSha256: contractHash(spec) };
}

/** Provenance describes the copy, not a mutable "latest deployment" pointer. */
export function verifyCopy(copy, record, upstream) {
  const spec = JSON.parse(copy);
  const expectedRecord = sourceRecord(spec, record.release, record.commit);
  if (Object.keys(record).length !== Object.keys(expectedRecord).length ||
      Object.entries(expectedRecord).some(([key, value]) => record[key] !== value)) {
    throw new Error('The API reference and its recorded source do not match.');
  }
  if (render(spec) !== copy) throw new Error('Regenerate the API reference formatting and Beta badges.');
  if (upstream !== undefined && (render(upstream) !== copy || contractHash(upstream) !== record.contractSha256)) {
    throw new Error('The API reference differs from its fetched upstream contract.');
  }
}

function main(args) {
  const check = args[0] === '--check';
  if (check) args = args.slice(1);
  const source = args[0] && !args[0].startsWith('-') ? JSON.parse(readFileSync(args.shift(), 'utf8')) : undefined;
  if (check) {
    if (args.length) throw new Error('Usage: sync-v1-openapi.mjs --check [upstream-file]');
    verifyCopy(readFileSync(COPY, 'utf8'), JSON.parse(readFileSync(SOURCE, 'utf8')), source);
    console.log(source ? 'API reference matches its upstream contract and source record.' : 'API reference and source record are consistent.');
    return;
  }
  if (!source || args.length !== 4 || args[0] !== '--release' || args[2] !== '--commit') {
    throw new Error('Usage: sync-v1-openapi.mjs <upstream-file> --release <tag> --commit <sha>');
  }
  const rendered = render(source);
  const record = sourceRecord(source, args[1], args[3]);
  writeFileSync(COPY, rendered);
  writeFileSync(SOURCE, `${JSON.stringify(record, null, 2)}\n`);
  console.log('Wrote the API reference and its source record.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
