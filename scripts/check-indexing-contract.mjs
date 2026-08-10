#!/usr/bin/env node
/**
 * Guard the docs trust boundary.
 *
 * Visible navigation is the authoritative, searchable product corpus. Every
 * MDX product page in the repository must be published there so unpublished
 * drafts and internal runbooks cannot become a second knowledge source.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(relPath) {
  return readFileSync(join(ROOT, relPath), 'utf8');
}

function collectPages(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPages(item, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  if (value.pages) collectPages(value.pages, out);
  if (value.groups) collectPages(value.groups, out);
  return out;
}

function firstFrontmatter(content) {
  return content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*["']?([^"'\\r\\n]+)["']?\\s*$`, 'm'));
  return match?.[1]?.trim() ?? null;
}

function mdxRoutes(dir = ROOT, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const absolute = join(dir, entry.name);
    if (entry.isDirectory()) {
      mdxRoutes(absolute, out);
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      out.push(relative(ROOT, absolute).split(sep).join('/').slice(0, -4));
    }
  }
  return out;
}

const docs = JSON.parse(readText('docs.json'));
if (docs.seo?.indexing !== 'navigable') {
  fail('docs.json must set seo.indexing to "navigable"');
}
if (docs.metadata?.timestamp !== true) {
  fail('docs.json must set metadata.timestamp to true');
}

const tabs = docs.navigation?.tabs ?? [];
for (const tab of tabs.filter((candidate) => candidate.hidden)) {
  fail(`Unexpected hidden tab: ${tab.tab}`);
}

const publishedPages = new Set(collectPages(tabs));

for (const page of publishedPages) {
  const path = `${page}.mdx`;
  if (!existsSync(join(ROOT, path))) {
    fail(`${path} is published but does not exist`);
    continue;
  }
  const frontmatter = firstFrontmatter(readText(path));
  if (!/^last-verified:\s*["']?\d{4}-\d{2}-\d{2}["']?\s*$/m.test(frontmatter)) {
    fail(`${page} must have last-verified before publication`);
  }
  if (/^(?:noindex|searchable):\s*(?:true|false)\s*$/m.test(frontmatter)) {
    fail(`${page} should rely on visible navigation for indexing, not a page-level indexing override`);
  }
}

for (const page of mdxRoutes()) {
  const frontmatter = firstFrontmatter(readText(`${page}.mdx`));
  const isPublished = publishedPages.has(page);
  const isNoindex = /^noindex:\s*true\s*$/m.test(frontmatter);

  if (!isPublished && !isNoindex) {
    fail(`${page} must be published or explicitly noindex`);
  }
  if (isPublished && isNoindex) {
    fail(`${page} cannot be published and marked noindex`);
  }
  if (/^searchable:\s*true\s*$/m.test(frontmatter) && !publishedPages.has(page)) {
    fail(`${page} cannot opt into search without being in visible navigation`);
  }
}

const openapi = JSON.parse(readText('openapi.json'));
const documentedOperations = new Map();

for (const page of mdxRoutes()) {
  const frontmatter = firstFrontmatter(readText(`${page}.mdx`));
  const operation = frontmatterValue(frontmatter, 'openapi');
  if (!operation) continue;

  if (!publishedPages.has(page)) {
    fail(`${page} documents ${operation} but is not in visible navigation`);
  }
  if (documentedOperations.has(operation)) {
    fail(`${operation} is documented by both ${documentedOperations.get(operation)} and ${page}`);
  } else {
    documentedOperations.set(operation, page);
  }
}

const schemaOperations = new Set();
for (const [path, pathItem] of Object.entries(openapi.paths ?? {})) {
  for (const method of Object.keys(pathItem ?? {})) {
    const normalizedMethod = method.toUpperCase();
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(normalizedMethod)) continue;
    schemaOperations.add(`${normalizedMethod} ${path}`);
  }
}

for (const operation of schemaOperations) {
  if (!documentedOperations.has(operation)) fail(`${operation} exists in openapi.json but has no published page`);
}
for (const [operation, page] of documentedOperations) {
  if (!schemaOperations.has(operation)) fail(`${page} references ${operation}, which is missing from openapi.json`);
}

if (failures.length > 0) {
  console.error(`Indexing contract failed with ${failures.length} issue(s):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`Indexing contract is valid: ${publishedPages.size} published page(s).`);
