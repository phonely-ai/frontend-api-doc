#!/usr/bin/env node
/**
 * Internal link & media reference checker for the Phonely docs repo.
 *
 * Why not `mint broken-links`: it false-positives on every page nested in a
 * sub-group of docs.json navigation (3-segment paths like
 * /blocks/live-call-actions/api-request), verified against the live site.
 * This script checks the same class of problems with zero false positives:
 *   - internal page links (markdown links and href attributes) resolve to an
 *     existing, non-mintignored .mdx page
 *   - media references (src attributes and markdown images) resolve to an
 *     existing file
 * All checks are case-sensitive even on case-insensitive filesystems, because
 * the live site's URLs are case-sensitive.
 *
 * Usage: node scripts/check-links.mjs   (exit 1 if anything is broken)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.git', '.github', '.mintlify', '.idea', 'scripts']);
const MEDIA_EXT = /\.(png|jpe?g|gif|svg|mp4|webp|webm|ico|txt)$/i;

// --- .mintignore: ignored files are not built, so they are invalid link targets
const mintignore = (() => {
  try {
    return readFileSync(join(ROOT, '.mintignore'), 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  } catch {
    return [];
  }
})();

function isMintignored(relPath) {
  return mintignore.some((pattern) => {
    if (pattern.endsWith('/**')) return relPath.startsWith(pattern.slice(0, -3) + '/');
    return relPath === pattern;
  });
}

function safeStat(path) {
  try {
    return statSync(path);
  } catch {
    return null; // broken symlink or unreadable entry — treat as absent
  }
}

// --- case-sensitive existence check (Windows fs lies about case)
const dirCache = new Map();
function listDir(dir) {
  if (!dirCache.has(dir)) {
    try {
      dirCache.set(dir, new Set(readdirSync(dir)));
    } catch {
      dirCache.set(dir, new Set());
    }
  }
  return dirCache.get(dir);
}

function existsExact(relPath) {
  let dir = ROOT;
  const segments = relPath.split('/');
  for (let i = 0; i < segments.length; i++) {
    if (!listDir(dir).has(segments[i])) return false;
    dir = join(dir, segments[i]);
  }
  return true;
}

// Mintlify 307-redirects a bare group/directory path to its first page, so a
// directory with at least one page under it is a valid link target.
function hasPageBeneath(relDir) {
  const dir = join(ROOT, ...relDir.split('/'));
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return false;
  }
  return entries.some((name) => {
    const st = safeStat(join(dir, name));
    if (!st) return false;
    if (st.isDirectory()) return hasPageBeneath(`${relDir}/${name}`);
    return name.endsWith('.mdx') && !isMintignored(`${relDir}/${name}`);
  });
}

// --- collect .mdx files
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = safeStat(full);
    if (!st) continue;
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (name.endsWith('.mdx')) {
      out.push(full);
    }
  }
  return out;
}

// --- extract internal references from one file
const LINK_PATTERNS = [
  /\]\(([^()\s]+)\)/g, // markdown links and images
  /(?:href|src)=["']([^"']+)["']/g, // JSX/HTML attributes
];

function extractRefs(content) {
  // Example paths inside code are not real links — strip fenced blocks and
  // inline code before matching.
  const prose = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const refs = new Set();
  for (const pattern of LINK_PATTERNS) {
    for (const match of prose.matchAll(pattern)) {
      let target = match[1];
      if (!target.startsWith('/') || target.startsWith('//')) continue; // external or protocol-relative
      target = target.split('#')[0].split('?')[0]; // strip anchor and query
      target = target.replace(/\/+$/, ''); // normalize trailing slash
      if (target) refs.add(target);
    }
  }
  return refs;
}

// --- run
const failures = [];
for (const file of walk(ROOT)) {
  const relFile = relative(ROOT, file).split(sep).join('/');
  const content = readFileSync(file, 'utf8');
  for (const ref of extractRefs(content)) {
    const relTarget = ref.slice(1); // drop leading /
    if (MEDIA_EXT.test(relTarget)) {
      if (!existsExact(relTarget)) failures.push({ file: relFile, ref, kind: 'media' });
    } else {
      const page = `${relTarget}.mdx`;
      if (existsExact(page)) {
        if (isMintignored(page)) failures.push({ file: relFile, ref, kind: 'mintignored page' });
      } else if (!(existsExact(relTarget) && hasPageBeneath(relTarget))) {
        failures.push({ file: relFile, ref, kind: 'page' });
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Found ${failures.length} broken internal reference(s):\n`);
  let lastFile = null;
  for (const { file, ref, kind } of failures) {
    if (file !== lastFile) {
      console.error(file);
      lastFile = file;
    }
    console.error(`  ✗ ${ref}  (${kind})`);
  }
  process.exit(1);
}
console.log('All internal links and media references resolve.');
