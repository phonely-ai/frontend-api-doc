import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReviewDate } from './check-review-dates.mjs';
const page = (date, body = 'Old claim') => `---\nlast-verified: ${date}\n---\n${body}`;
test('changed prose with stale date is rejected', () => assert.throws(() => validateReviewDate(page('2026-08-01'), page('2026-08-01', 'New claim'), '2026-09-07')));
test('renewed and same-day reviews pass', () => {
  validateReviewDate(page('2026-08-01'), page('2026-09-07', 'New claim'), '2026-09-07');
  validateReviewDate(page('2026-09-07'), page('2026-09-07', 'New claim'), '2026-09-07');
});
test('metadata-only changes do not require a review date bump', () => validateReviewDate(page('2026-08-01'), page('2026-08-01').replace('---\n', '---\ntitle: Updated\n'), '2026-09-07'));
test('missing and regressed dates fail', () => {
  assert.throws(() => validateReviewDate('', 'New page', '2026-09-07'));
  assert.throws(() => validateReviewDate(page('2026-08-01'), page('2026-07-01', 'New claim'), '2026-09-07'));
});

test('Git output newline normalization does not turn metadata-only edits into content changes', () => validateReviewDate(page('2026-08-01'), page('2026-08-01') + '\n', '2026-09-07'));

test('indirect page changes require renewed review even when its prose is unchanged',()=>assert.throws(()=>validateReviewDate(page('2026-08-01'),page('2026-08-01'),'2026-09-07',true)));
