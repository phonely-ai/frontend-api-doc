#!/usr/bin/env node
/**
 * Guard the docs indexing contract.
 *
 * PHO-9231 intentionally narrows global indexing from every MDX file to the
 * navigable docs surface. Hidden pages that must remain available to search,
 * the AI assistant, sitemap, and auto-generated llms.txt need an explicit
 * `searchable: true` opt-in.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const EXPECTED_AI_RUNBOOKS = [
  'ai/route-map',
  'ai/build-agent',
  'ai/manage-knowledge-base',
  'ai/edit-flows',
  'ai/run-ab-tests-and-evaluations',
  'ai/review-calls-and-analytics',
  'ai/configure-outbound-campaigns',
  'ai/frontend-api-boundaries',
];

// PHO-9228 triaged these as unique but not ready for visible navigation.
// PHO-9245 backfill work should remove entries from this list as each page is
// verified and promoted into the visible docs surface.
const EXPECTED_SEARCHABLE_PAGES = [
  'api-reference/endpoint/delete-agent-documents',
  'api-reference/endpoint/delete-agent-websites',
  'api-reference/endpoint/post-agent-documents',
  'api-reference/endpoint/post-agent-websites',
  'billing-and-usage/account',
  'billing-and-usage/teams',
  'key-concepts/flow-canvas-controls',
  'testing/simulation-testing',
  'workflow-checklist',
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

function sameList(actual, expected) {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function firstFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match?.[1] ?? '';
}

function hasSearchableFrontmatter(relPage) {
  const path = `${relPage}.mdx`;
  if (!existsSync(join(ROOT, path))) {
    fail(`${path} is listed as searchable but does not exist`);
    return false;
  }
  return /^searchable:\s*true\s*$/m.test(firstFrontmatter(readText(path)));
}

const docs = JSON.parse(readText('docs.json'));

if (docs.seo?.indexing !== 'navigable') {
  fail('docs.json must set seo.indexing to "navigable"');
}

if (docs.metadata?.timestamp !== true) {
  fail('docs.json must set metadata.timestamp to true');
}

const tabs = docs.navigation?.tabs ?? [];
const webhookTab = tabs.find((tab) => tab.tab === 'Webhook Reference');
if (!webhookTab?.hidden || webhookTab.searchable !== true) {
  fail('Webhook Reference tab must be hidden and searchable');
}

const aiTab = tabs.find((tab) => tab.tab === 'AI Runbooks');
if (!aiTab?.hidden || aiTab.searchable !== true) {
  fail('AI Runbooks tab must be hidden and searchable');
} else if (!sameList(aiTab.pages ?? [], EXPECTED_AI_RUNBOOKS)) {
  fail('AI Runbooks tab pages must match the expected runbook list');
}

for (const page of EXPECTED_AI_RUNBOOKS) {
  if (!existsSync(join(ROOT, `${page}.mdx`))) {
    fail(`${page}.mdx is listed as an AI runbook but does not exist`);
  }
}

const assistant = readText('.mintlify/Assistant.md');
for (const page of EXPECTED_AI_RUNBOOKS) {
  if (!assistant.includes(`/${page}`)) {
    fail(`.mintlify/Assistant.md does not mention /${page}`);
  }
}

for (const page of EXPECTED_SEARCHABLE_PAGES) {
  if (!hasSearchableFrontmatter(page)) {
    fail(`${page}.mdx must keep searchable: true frontmatter`);
  }
}

if (failures.length > 0) {
  console.error(`Indexing contract failed with ${failures.length} issue(s):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Indexing contract is valid.');
