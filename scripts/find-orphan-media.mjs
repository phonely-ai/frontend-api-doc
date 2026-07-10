#!/usr/bin/env node
/**
 * Orphaned media detector for the Phonely docs repo.
 *
 * Lists media files (images/video) that no content file references. Matching
 * is deliberately conservative — a media file is kept if its *basename*
 * appears anywhere in any .mdx/.md/.css/.json content file — so a false
 * positive here means keeping a dead file, never deleting a live one.
 *
 * Usage:
 *   node scripts/find-orphan-media.mjs           human-readable summary
 *   node scripts/find-orphan-media.mjs --fail-on-orphans
 *   node scripts/find-orphan-media.mjs --paths   orphan paths only (pipe to git rm)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, basename } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', '.git', '.github', '.mintlify', '.idea', 'scripts']);
const MEDIA_EXT = /\.(png|jpe?g|gif|svg|mp4|webp|webm|ico)$/i;
const CONTENT_EXT = /\.(mdx|md|css|json)$/i;
const SKIP_CONTENT = new Set(['package-lock.json', 'package.json']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else {
      out.push({ path: full, size: st.size });
    }
  }
  return out;
}

const files = walk(ROOT);
const mediaFiles = files.filter((f) => MEDIA_EXT.test(f.path));
const contentFiles = files.filter(
  (f) => CONTENT_EXT.test(f.path) && !SKIP_CONTENT.has(basename(f.path))
);

// Search content for each media file's literal basename, requiring a
// non-filename character before it. Literal search survives characters a
// tokenizer chokes on (";"), the boundary check stops suffix collisions
// (end-call-reasons.png must not match outcomes-topics-end-call-reasons.png).
const contentBlob = contentFiles.map(({ path }) => readFileSync(path, 'utf8')).join('\n');
function isReferenced(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\w.;~@%-])${escaped}`, 'im').test(contentBlob);
}
const referenced = new Set(
  mediaFiles.map((f) => basename(f.path).toLowerCase()).filter(isReferenced)
);

// Branding files are loaded by platform convention (favicon fallbacks, social
// cards), not by in-content references — never report them as orphans.
function isBranding(rel) {
  return rel.startsWith('logo/') || rel === 'favicon.svg';
}

const orphans = mediaFiles
  .filter((f) => !referenced.has(basename(f.path).toLowerCase()))
  .filter((f) => !isBranding(relative(ROOT, f.path).split(sep).join('/')))
  .map((f) => ({ rel: relative(ROOT, f.path).split(sep).join('/'), size: f.size }))
  .sort((a, b) => b.size - a.size);

if (process.argv.includes('--paths')) {
  for (const { rel } of orphans) console.log(rel);
} else {
  const totalMB = (orphans.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1);
  const keptCount = mediaFiles.length - orphans.length;
  for (const { rel, size } of orphans) {
    console.log(`${(size / 1024 / 1024).toFixed(2).padStart(8)} MB  ${rel}`);
  }
  console.log(`\n${orphans.length} orphaned media file(s), ${totalMB} MB total`);
  console.log(`${keptCount} media file(s) referenced and kept`);
}

if (process.argv.includes('--fail-on-orphans') && orphans.length > 0) {
  process.exit(1);
}
