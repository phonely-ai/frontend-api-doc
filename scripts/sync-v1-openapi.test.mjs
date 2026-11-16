import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contractHash, render, sourceRecord, verifyCopy } from './sync-v1-openapi.mjs';

const commit = 'a'.repeat(40);
const spec = () => ({ openapi: '3.1.0', paths: {
  '/v1/agents': { get: { operationId: 'list_agents', 'x-stability-level': 'stable' } },
  '/v1/agents/{id}/settings': { patch: { operationId: 'update_settings', 'x-stability-level': 'beta' } },
} });

test('renders only Beta presentation, without mutating the source', () => {
  const upstream = spec();
  const before = structuredClone(upstream);
  const output = JSON.parse(render(upstream));
  assert.deepEqual(output.paths['/v1/agents/{id}/settings'].patch['x-mint'], { metadata: { tag: 'Beta' } });
  delete output.paths['/v1/agents/{id}/settings'].patch['x-mint'];
  assert.deepEqual(output, upstream);
  assert.deepEqual(upstream, before);
});

test('an upstream contract change is rejected even when the copy is internally consistent', () => {
  const upstream = spec();
  const copy = render(upstream);
  const record = sourceRecord(upstream, 'v0.231.1', commit);
  verifyCopy(copy, record, upstream);
  const changed = spec();
  changed.paths['/v1/agents'].get.description = 'Changed contract';
  assert.throws(() => verifyCopy(copy, record, changed), /differs from/);
});

test('detects tampered copy, source hash and identity metadata', () => {
  const upstream = spec();
  const record = sourceRecord(upstream, 'v0.231.1', commit);
  assert.throws(() => verifyCopy(render(upstream), { ...record, contractSha256: '0'.repeat(64) }), /do not match/);
  assert.throws(() => verifyCopy(render(upstream), { ...record, repository: 'other/repo' }), /do not match/);
  assert.throws(() => verifyCopy(render(upstream), { ...record, commit: 'main' }), /immutable commit/);
  const changed = spec();
  changed.paths['/v1/agents'].get.description = 'Tampered';
  assert.throws(() => verifyCopy(render(changed), record), /do not match/);
});

test('removes stale Beta badges and rejects formatting-only copy edits', () => {
  const upstream = spec();
  upstream.paths['/v1/agents'].get['x-mint'] = { metadata: { tag: 'Beta' } };
  const rendered = render(upstream);
  assert.equal(JSON.parse(rendered).paths['/v1/agents'].get['x-mint'], undefined);
  const record = sourceRecord(upstream, 'v0.231.1', commit);
  assert.throws(() => verifyCopy(rendered.trim(), record), /formatting/);
});

test('an older confirmed source is a valid rollback snapshot, not a reversed review cursor', () => {
  const older = spec();
  const record = sourceRecord(older, 'v0.230.0', 'b'.repeat(40));
  verifyCopy(render(older), record, older);
});

test('rejects non-v1 documents and empty contracts', () => {
  assert.throws(() => render({ openapi: '3.1.0', paths: { '/public/agents': {} } }), /customer/);
  assert.throws(() => render({ openapi: '3.1.0', paths: {} }), /customer/);
});

test('formatting and Mint presentation do not change the canonical contract hash', () => {
  const upstream = spec();
  assert.equal(contractHash(upstream), contractHash(JSON.parse(render(upstream))));
  assert.equal(contractHash(upstream), contractHash(JSON.parse(JSON.stringify(upstream, null, 4))));
});
