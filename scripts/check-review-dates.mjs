import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const date = text => /^last-verified:\s*["']?(\d{4}-\d{2}-\d{2})/m.exec(text)?.[1];
const body = text => text.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, '').replace(/\r\n/g, '\n');
export function validateReviewDate(before, after, reviewDay) {
  if (body(before) === body(after)) return;
  const next = date(after);
  if (!next || (next === date(before) && next !== reviewDay) || (date(before) && next < date(before))) {
    throw new Error('Changed page content requires a renewed last-verified date after a whole-page review (same-day reviews may retain today’s date).');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const base = process.argv[2];
  if (!base || !/^[a-f0-9]{40}$/i.test(base)) throw new Error('Pass the full base commit SHA');
  const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
  // Use the committed head date so a delayed CI rerun gives the same result.
  const reviewDay = git(['show', '-s', '--format=%cI', process.env.REVIEW_HEAD_SHA || 'HEAD']).slice(0, 10);
  const files = git(['diff', '--name-only', '--diff-filter=AM', '-z', base, '--', '*.mdx']).split('\0').filter(Boolean);
  const originalFiles = new Set(git(['ls-tree', '-r', '--name-only', '-z', base]).split('\0'));
  for (const file of files) {
    const before = originalFiles.has(file) ? git(['show', `${base}:${file}`]) : '';
    try { validateReviewDate(before, readFileSync(file, 'utf8'), reviewDay); }
    catch (error) { throw new Error(`${file}: ${error.message}`); }
  }
  console.log(`Review dates checked for ${files.length} changed MDX page(s). Dates record a review; they do not prove source coverage.`);
}
