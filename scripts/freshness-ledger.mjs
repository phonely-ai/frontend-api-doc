#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, 'freshness.config.json');
const LEDGER_PATH = join(ROOT, 'freshness-ledger.json');
const WRITE = process.argv.includes('--write');
const RESOLVE_SOURCES = process.argv.includes('--resolve-sources');
const KNOWN_FLAGS = new Set(['--write', '--resolve-sources']);
const UNKNOWN_FLAGS = process.argv.slice(2).filter((argument) => !KNOWN_FLAGS.has(argument));
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_DISPOSITIONS = new Set([
  'docs-updated',
  'already-covered',
  'no-doc-change',
  'needs-doc-update',
  'not-public',
]);

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isIsoDate(value) {
  if (!DATE_PATTERN.test(value ?? '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function getReviewWindows(config) {
  return Array.isArray(config.reviewWindows) ? config.reviewWindows : [];
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
  if (value.tabs) collectPages(value.tabs, out);
  return out;
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

function parseFrontmatter(text, route) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) fail(`${route}: missing frontmatter`);
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) fail(`${route}: unterminated frontmatter`);
  const lines = normalized.slice(4, end).split('\n');
  const data = {};

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(lines[index]);
    if (!match) continue;
    const [, key, rawValue = ''] = match;
    if (rawValue === '') {
      const values = [];
      while (index + 1 < lines.length) {
        const item = /^\s*-\s+(.+?)\s*$/.exec(lines[index + 1]);
        if (!item) break;
        values.push(stripQuotes(item[1]));
        index += 1;
      }
      data[key] = values;
    } else {
      data[key] = stripQuotes(rawValue.trim());
    }
  }
  return data;
}

function validateRef(ref, label) {
  if (!ref?.label || !SHA_PATTERN.test(ref.commit ?? '')) {
    fail(`${label}: label and a full 40-character lowercase commit SHA are required`);
  }
}

function validateConfig(config) {
  if (config.schemaVersion !== 1) fail('freshness.config.json: schemaVersion must be 1');
  if (!Array.isArray(config.repositories) || config.repositories.length === 0) {
    fail('freshness.config.json: repositories must be a non-empty array');
  }

  const repositoryIds = new Set();
  const prefixes = new Set();
  for (const repository of config.repositories) {
    if (!repository.id || repositoryIds.has(repository.id)) fail(`Duplicate or missing repository id: ${repository.id}`);
    if (typeof repository.sourcePrefix !== 'string' || prefixes.has(repository.sourcePrefix)) {
      fail(`Duplicate or invalid sourcePrefix for ${repository.id}`);
    }
    if (repository.sourcePrefix && !repository.sourcePrefix.endsWith('/')) {
      fail(`${repository.id}: non-empty sourcePrefix must end with /`);
    }
    if (!repository.rootEnv) fail(`${repository.id}: rootEnv is required`);
    repositoryIds.add(repository.id);
    prefixes.add(repository.sourcePrefix);
    if (repository.accountedThrough) validateRef(repository.accountedThrough, `${repository.id}.accountedThrough`);
  }
  if (!prefixes.has('')) fail('One repository must own unprefixed sources');

  const windows = getReviewWindows(config);
  const windowIds = new Set();
  for (const window of windows) {
    if (!window.id || windowIds.has(window.id)) fail(`Duplicate or missing review window id: ${window.id}`);
    if (!repositoryIds.has(window.repository)) fail(`${window.id}: unknown repository ${window.repository}`);
    if (!window.issue) fail(`${window.id}: issue is required`);
    if (!isIsoDate(window.reviewedOn)) fail(`${window.id}: reviewedOn must be a valid YYYY-MM-DD date`);
    validateRef(window.fromExclusive, `${window.id}.fromExclusive`);
    validateRef(window.throughInclusive, `${window.id}.throughInclusive`);
    if (!Array.isArray(window.dispositions) || window.dispositions.length === 0) {
      fail(`${window.id}: dispositions must be non-empty`);
    }
    const dispositionIds = new Set();
    for (const disposition of window.dispositions) {
      if (!disposition.id || dispositionIds.has(disposition.id)) fail(`${window.id}: duplicate disposition ${disposition.id}`);
      if (!ALLOWED_DISPOSITIONS.has(disposition.status)) {
        fail(`${window.id}/${disposition.id}: unsupported status ${disposition.status}`);
      }
      if (!Array.isArray(disposition.pages) || !disposition.note) {
        fail(`${window.id}/${disposition.id}: pages and note are required`);
      }
      if (new Set(disposition.pages).size !== disposition.pages.length) {
        fail(`${window.id}/${disposition.id}: pages must not contain duplicates`);
      }
      if (disposition.status === 'not-public' && disposition.pages.length > 0) {
        fail(`${window.id}/${disposition.id}: not-public dispositions must not name public pages`);
      }
      if (disposition.status !== 'not-public' && disposition.pages.length === 0) {
        fail(`${window.id}/${disposition.id}: ${disposition.status} dispositions must name at least one page`);
      }
      dispositionIds.add(disposition.id);
    }
    windowIds.add(window.id);
  }

  for (const repository of config.repositories) {
    const repositoryWindows = windows.filter((window) => window.repository === repository.id);
    if (!repository.accountedThrough) {
      if (repositoryWindows.length > 0) {
        fail(`${repository.id}: review windows require accountedThrough`);
      }
      continue;
    }
    if (repositoryWindows.length === 0) {
      fail(`${repository.id}: accountedThrough requires at least one review window`);
    }
    for (let index = 0; index < repositoryWindows.length; index += 1) {
      const window = repositoryWindows[index];
      if (window.fromExclusive.commit === window.throughInclusive.commit) {
        fail(`${window.id}: review window must advance to a different commit`);
      }
      const previous = repositoryWindows[index - 1];
      if (previous && window.fromExclusive.commit !== previous.throughInclusive.commit) {
        fail(`${window.id}: fromExclusive must match the previous review window's throughInclusive commit`);
      }
    }
    const latestWindow = repositoryWindows.at(-1);
    if (latestWindow.throughInclusive.commit !== repository.accountedThrough.commit) {
      fail(`${repository.id}: accountedThrough must match the final review window's throughInclusive commit`);
    }
  }
}

function sourceOwner(source, repositories) {
  const explicit = repositories
    .filter((repository) => repository.sourcePrefix)
    .sort((a, b) => b.sourcePrefix.length - a.sourcePrefix.length)
    .find((repository) => source.startsWith(repository.sourcePrefix));
  const repository = explicit ?? repositories.find((candidate) => candidate.sourcePrefix === '');
  if (!repository) fail(`No repository owns source: ${source}`);
  const path = explicit ? source.slice(repository.sourcePrefix.length) : source;
  if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').includes('..')) {
    fail(`Invalid source path: ${source}`);
  }
  return { repository: repository.id, path };
}

function buildLedger(config) {
  const docs = readJson(join(ROOT, 'docs.json'));
  const routes = [...new Set(collectPages(docs.navigation?.tabs ?? []))].sort();
  const reviewWindows = getReviewWindows(config);
  const pendingRoutes = new Set();
  for (const window of reviewWindows) {
    for (const disposition of window.dispositions) {
      for (const route of disposition.pages) {
        if (disposition.status === 'needs-doc-update') pendingRoutes.add(route);
        if (disposition.status === 'docs-updated') pendingRoutes.delete(route);
      }
    }
  }
  const pages = routes.map((route) => {
    const file = join(ROOT, `${route}.mdx`);
    if (!existsSync(file)) fail(`${route}: indexed page does not exist`);
    const metadata = parseFrontmatter(readFileSync(file, 'utf8'), route);
    if (!metadata.title) fail(`${route}: title is required`);
    if (!Array.isArray(metadata.sources) || metadata.sources.length === 0) fail(`${route}: sources are required`);
    if (metadata['last-verified'] && !isIsoDate(metadata['last-verified'])) {
      fail(`${route}: last-verified must be a valid YYYY-MM-DD date`);
    }
    if (new Set(metadata.sources).size !== metadata.sources.length) {
      fail(`${route}: sources must not contain duplicates`);
    }
    const sources = metadata.sources.map((source) => ({ source, ...sourceOwner(source, config.repositories) }));
    return {
      route,
      title: metadata.title,
      lastVerified: metadata['last-verified'] ?? null,
      status: pendingRoutes.has(route)
        ? 'needs-doc-update'
        : metadata['last-verified']
          ? 'content-reviewed'
          : 'awaiting-content-review',
      sources,
    };
  });

  const knownRoutes = new Set(routes);
  for (const window of reviewWindows) {
    for (const disposition of window.dispositions) {
      for (const route of disposition.pages) {
        if (!knownRoutes.has(route)) fail(`${window.id}/${disposition.id}: unknown page ${route}`);
      }
    }
  }

  return {
    schemaVersion: config.schemaVersion,
    repositories: config.repositories,
    reviewWindows,
    pages,
  };
}

function globToRegExp(glob) {
  let pattern = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === '*' && glob[index + 1] === '*') {
      pattern += '.*';
      index += 1;
    } else if (character === '*') {
      pattern += '[^/]*';
    } else if (character === '?') {
      pattern += '[^/]';
    } else {
      pattern += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${pattern}$`);
}

function resolveSources(ledger) {
  const filesByRepository = new Map();
  for (const repository of ledger.repositories) {
    const root = process.env[repository.rootEnv];
    if (!root) fail(`${repository.rootEnv} is required with --resolve-sources`);
    const resolvedRoot = resolve(root);
    const output = execFileSync('git', ['-C', resolvedRoot, 'ls-files'], { encoding: 'utf8' });
    filesByRepository.set(
      repository.id,
      output.split(/\r?\n/).filter(Boolean).map((file) => file.replaceAll('\\', '/')),
    );

    const windows = ledger.reviewWindows.filter((window) => window.repository === repository.id);
    const commits = new Set([
      ...(repository.accountedThrough ? [repository.accountedThrough.commit] : []),
      ...windows.flatMap((window) => [window.fromExclusive.commit, window.throughInclusive.commit]),
    ]);
    for (const commit of commits) {
      try {
        execFileSync('git', ['-C', resolvedRoot, 'cat-file', '-e', `${commit}^{commit}`], { stdio: 'pipe' });
      } catch {
        fail(`${repository.id}: commit is not available locally: ${commit}`);
      }
    }
    for (const window of windows) {
      try {
        execFileSync(
          'git',
          ['-C', resolvedRoot, 'merge-base', '--is-ancestor', window.fromExclusive.commit, window.throughInclusive.commit],
          { stdio: 'pipe' },
        );
      } catch {
        fail(`${window.id}: fromExclusive must be an ancestor of throughInclusive`);
      }
    }
  }

  const failures = [];
  for (const page of ledger.pages) {
    for (const source of page.sources) {
      const files = filesByRepository.get(source.repository);
      const pattern = globToRegExp(source.path);
      if (!files.some((file) => pattern.test(file))) failures.push(`${page.route}: ${source.source}`);
    }
  }
  if (failures.length) fail(`Unresolved source mappings (${failures.length}):\n- ${failures.join('\n- ')}`);
}

try {
  if (UNKNOWN_FLAGS.length > 0) fail(`Unsupported argument(s): ${UNKNOWN_FLAGS.join(', ')}`);
  const config = readJson(CONFIG_PATH);
  validateConfig(config);
  const ledger = buildLedger(config);
  const serialized = `${JSON.stringify(ledger, null, 2)}\n`;

  if (RESOLVE_SOURCES) resolveSources(ledger);

  if (WRITE) {
    writeFileSync(LEDGER_PATH, serialized);
    console.log(`Wrote ${relative(ROOT, LEDGER_PATH).split(sep).join('/')} for ${ledger.pages.length} page(s).`);
  }

  const reviewed = ledger.pages.filter((page) => page.status === 'content-reviewed').length;
  const pending = ledger.pages.filter((page) => page.status === 'needs-doc-update').length;
  console.log(
    `Freshness ledger is valid: ${reviewed}/${ledger.pages.length} page(s) content-reviewed; ${pending} need documentation updates.`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
