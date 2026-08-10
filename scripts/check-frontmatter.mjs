#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DOCS_JSON = join(ROOT, 'docs.json');
const BROAD_SOURCE_PATTERNS = new Set([
  '*',
  '**',
  'app/**',
  'app/(main)/**',
  'app/(main)/(routes)/**',
  'app/api/**',
  'features/**',
  'services/**',
  'lib/**',
]);
const BLOCK_SCALAR_PATTERN = /^[>|][+-]?(?:\s+#.*)?$/;
const SENSITIVE_SOURCE_PATTERNS = [
  /(?:^|\/)\.env(?:\.|$)/i,
  /(?:^|\/)(?:secrets?|credentials?)(?:\/|\.|$)/i,
  /(?:^|\/)hooks\/firebase-admin(?:\.|\/|$)/i,
  /(?:^|\/)lib\/server-firebase-request-auth(?:\.|\/|$)/i,
  /(?:^|\/)services\/billing(?:\/|$)/i,
  /(?:^|\/)app\/api\/(?:admin|stripe-)(?:\/|[^/]*$)/i,
];

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
  if (value.tabs) collectPages(value.tabs, out);
  return out;
}

function parseFrontmatter(text) {
  text = text.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---', 4);
  if (end === -1) return null;
  const raw = text.slice(4, end).trimEnd();
  const data = {};
  const errors = [];
  const lines = raw.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;

    const match = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(line);
    if (!match) {
      errors.push(`line ${i + 1}: unsupported frontmatter syntax`);
      continue;
    }

    const [, key, rawValue = ''] = match;
    if (rawValue === '') {
      const list = [];
      while (i + 1 < lines.length) {
        const itemMatch = /^\s*-\s+(.+?)\s*$/.exec(lines[i + 1]);
        if (!itemMatch) break;
        list.push(stripQuotes(itemMatch[1]));
        i += 1;
      }
      data[key] = list;
    } else {
      const value = rawValue.trim();
      if (BLOCK_SCALAR_PATTERN.test(value)) {
        errors.push(`line ${i + 1}: block scalar values are not supported (${key})`);
        continue;
      }
      data[key] = stripQuotes(value);
    }
  }

  return { data, errors };
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function pagePath(route) {
  return join(ROOT, `${route}.mdx`);
}

const docs = JSON.parse(readFileSync(DOCS_JSON, 'utf8'));
const pages = collectPages(docs.navigation?.tabs ?? []);
const errors = [];
const warnings = [];

for (const page of pages) {
  const file = pagePath(page);
  if (!existsSync(file)) {
    errors.push(`${page}: missing ${page}.mdx`);
    continue;
  }

  const parsed = parseFrontmatter(readFileSync(file, 'utf8'));
  if (!parsed) {
    errors.push(`${page}: missing frontmatter`);
    continue;
  }
  const { data: frontmatter, errors: parseErrors } = parsed;
  for (const error of parseErrors) errors.push(`${page}: ${error}`);

  if (typeof frontmatter.title !== 'string' || frontmatter.title.trim() === '') {
    errors.push(`${page}: missing title`);
  }

  if (typeof frontmatter.description !== 'string' || frontmatter.description.trim() === '') {
    errors.push(`${page}: missing description`);
  } else if (frontmatter.description.includes('\n')) {
    errors.push(`${page}: description must be a single line`);
  }

  if (!Array.isArray(frontmatter.sources) || frontmatter.sources.length === 0) {
    errors.push(`${page}: missing non-empty sources`);
  } else {
    for (const source of frontmatter.sources) {
      if (typeof source !== 'string' || source.trim() === '') {
        errors.push(`${page}: sources contains an empty entry`);
        continue;
      }
      if (BROAD_SOURCE_PATTERNS.has(source.trim())) {
        errors.push(`${page}: source glob is too broad (${source})`);
      }
      if (SENSITIVE_SOURCE_PATTERNS.some((pattern) => pattern.test(source.trim()))) {
        errors.push(`${page}: source metadata exposes a sensitive implementation path (${source})`);
      }
    }
  }

  if (typeof frontmatter['last-verified'] !== 'string') {
    // Add this only after the page's factual and editorial review. Do not
    // manufacture a review date just to make legacy pages pass CI.
    warnings.push(`${page}: missing last-verified`);
  } else {
    const verified = frontmatter['last-verified'].trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(verified) || Number.isNaN(Date.parse(`${verified}T00:00:00Z`))) {
      errors.push(`${page}: last-verified must be a valid YYYY-MM-DD date`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Frontmatter lint failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(`Frontmatter lint found ${warnings.length} tracked page(s) awaiting content review.`);
}

console.log(`Frontmatter lint passed for ${pages.length} tracked page(s).`);
