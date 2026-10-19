import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(new URL('./freshness-ledger.mjs', import.meta.url));

function runLedger(t, { redirects = [], dispositions = [{ status: 'docs-updated', pages: ['guide/current'] }] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'docs-ledger-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const ref = (index) => ({ label: 'v' + index, commit: String(index).padStart(40, '0') });
  const config = {
    schemaVersion: 1,
    repositories: [{ id: 'frontend', sourcePrefix: '', rootEnv: 'TEST_SOURCE_ROOT', accountedThrough: ref(dispositions.length) }],
    reviewWindows: dispositions.map((disposition, index) => ({
      id: 'review-' + index, repository: 'frontend', issue: 'TEST-1', reviewedOn: '2026-10-19',
      fromExclusive: ref(index), throughInclusive: ref(index + 1),
      dispositions: [{ id: 'change', note: 'Source-reviewed page.', ...disposition }],
    })),
  };
  mkdirSync(join(root, 'guide'));
  writeFileSync(join(root, 'guide/current.mdx'), '---\ntitle: Current\nsources:\n  - feature.ts\nlast-verified: 2026-10-19\n---\n');
  writeFileSync(join(root, 'docs.json'), JSON.stringify({ navigation: { tabs: [{ pages: ['guide/current'] }] }, redirects }));
  writeFileSync(join(root, 'freshness.config.json'), JSON.stringify(config));
  const result = spawnSync(process.execPath, [script, '--write'], { cwd: root, encoding: 'utf8' });
  return {
    ...result,
    ledger: result.status === 0 ? JSON.parse(readFileSync(join(root, 'freshness-ledger.json'), 'utf8')) : null,
    config,
  };
}

test('canonical routes retain their review state', (t) => {
  const result = runLedger(t);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.ledger.pages[0].status, 'content-reviewed');
});

test('a renamed page retains pending work and immutable history', (t) => {
  const result = runLedger(t, {
    redirects: [{ source: '/guide/old', destination: '/guide/current' }],
    dispositions: [{ status: 'needs-doc-update', pages: ['guide/old'] }],
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.ledger.pages[0].status, 'needs-doc-update');
  assert.deepEqual(result.ledger.reviewWindows, result.config.reviewWindows);
});

test('new-route updates close old-route pending work', (t) => {
  const result = runLedger(t, {
    redirects: [{ source: '/guide/old', destination: '/guide/current' }],
    dispositions: [
      { status: 'needs-doc-update', pages: ['guide/old'] },
      { status: 'docs-updated', pages: ['guide/current'] },
    ],
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.ledger.pages[0].status, 'content-reviewed');
});

test('redirect chains preserve later historical updates', (t) => {
  const result = runLedger(t, {
    redirects: [
      { source: '/guide/old', destination: '/guide/intermediate' },
      { source: '/guide/intermediate', destination: '/guide/current' },
    ],
    dispositions: [
      { status: 'needs-doc-update', pages: ['guide/current'] },
      { status: 'docs-updated', pages: ['guide/old'] },
    ],
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.ledger.pages[0].status, 'content-reviewed');
});

for (const [name, redirects] of [
  ['missing redirect', []],
  ['missing destination', [{ source: '/guide/old', destination: '/guide/missing' }]],
  ['external destination', [{ source: '/guide/old', destination: 'https://example.com' }]],
  ['protocol-relative destination', [{ source: '/guide/old', destination: '//example.com' }]],
  ['wrong URL case', [{ source: '/guide/OLD', destination: '/guide/current' }]],
  ['redirect cycle', [
    { source: '/guide/old', destination: '/guide/loop' },
    { source: '/guide/loop', destination: '/guide/old' },
  ]],
]) {
  test('rejects historical references with ' + name, (t) => {
    const result = runLedger(t, { redirects, dispositions: [{ status: 'docs-updated', pages: ['guide/old'] }] });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown historical page|redirect cycle/);
  });
}
