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
 *   node scripts/sync-v1-openapi.mjs <db-svc openapi/v1.json>   write the copy
 *   node scripts/sync-v1-openapi.mjs --check                     verify the copy (CI)
 *
 * Take the source from db-svc's latest release, for example:
 *   git -C ../phonely-db-svc show <release tag>:openapi/v1.json > /tmp/v1.json
 *
 * `--check` needs no network: it fails if the copy's badges or formatting
 * differ from what this script writes, such as a badge left on an endpoint
 * that is no longer beta. It can't see the db-svc source, so the content
 * itself stays correct by being regenerated from it, never edited here.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const COPY = 'api-reference/v1/openapi.json';
const HTTP_METHODS = new Set(['get', 'put', 'post', 'patch', 'delete', 'options', 'head', 'trace']);

function render(spec) {
  const copy = structuredClone(spec);
  for (const pathItem of Object.values(copy.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue;
      delete operation['x-mint'];
      if (operation['x-stability-level'] === 'beta') {
        operation['x-mint'] = { metadata: { tag: 'Beta' } };
      }
    }
  }
  return `${JSON.stringify(copy, null, 2)}\n`;
}

const [argument] = process.argv.slice(2);

if (argument === '--check') {
  const committed = readFileSync(COPY, 'utf8');
  if (render(JSON.parse(committed)) !== committed) {
    console.error(`${COPY} is not what scripts/sync-v1-openapi.mjs writes. Regenerate it from db-svc's openapi/v1.json.`);
    process.exit(1);
  }
  console.log(`${COPY} matches its sync output.`);
} else if (argument && !argument.startsWith('-')) {
  const source = JSON.parse(readFileSync(argument, 'utf8'));
  if (!source.openapi || !source.paths || !Object.keys(source.paths).every((path) => path.startsWith('/v1/'))) {
    console.error(`${argument} is not db-svc's /v1 spec.`);
    process.exit(1);
  }
  writeFileSync(COPY, render(source));
  console.log(`Wrote ${COPY}.`);
} else {
  console.error('Usage: node scripts/sync-v1-openapi.mjs <db-svc openapi/v1.json> | --check');
  process.exit(1);
}
