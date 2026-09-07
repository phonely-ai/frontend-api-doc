import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Stable behavior IDs: updating a page never implicitly resolves another item.
export function pendingItems(config) {
  const pending = new Map();
  const seen = new Set();
  const close = (record, label) => {
    if (!Array.isArray(record.resolves)) throw new Error(`${label}: resolves must be an array`);
    for (const id of record.resolves) {
      const item = pending.get(id);
      if (!item) throw new Error(`${label}: unknown or already resolved item ${id}`);
      if (!item.pages.every(page => record.pages?.includes(page))) throw new Error(`${label}: resolution must cover all item pages`);
      pending.delete(id);
    }
  };
  for (const window of config.reviewWindows ?? []) {
    for (const disposition of window.dispositions ?? []) {
      const id = `${window.id}/${disposition.id}`;
      if (seen.has(id)) throw new Error(`Duplicate pending/disposition ID: ${id}`);
      seen.add(id);
      if (disposition.status === 'needs-doc-update') {
        pending.set(id, { id, pages: disposition.pages, note: disposition.note, openedOn: window.reviewedOn });
      }
      if (disposition.resolves?.length) {
        if (disposition.status !== 'docs-updated') throw new Error(`${id}: only docs-updated can resolve work`);
        close(disposition, id);
      }
    }
  }
  for (const record of config.resolutions ?? []) {
    if (!record.id || seen.has(record.id) || !record.issue || !record.note?.trim() ||
        !/^\d{4}-\d{2}-\d{2}$/.test(record.reviewedOn ?? '') || !record.resolves?.length) {
      throw new Error('Resolution requires unique id, issue, date, note and explicit item IDs');
    }
    seen.add(record.id); close(record, record.id);
  }
  return [...pending.values()];
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(pendingItems(JSON.parse(readFileSync(process.argv[2] || 'freshness.config.json', 'utf8')))));
}
