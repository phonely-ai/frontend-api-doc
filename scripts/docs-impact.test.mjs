import test from 'node:test';
import assert from 'node:assert/strict';
import { affectedPages } from './docs-impact.mjs';
import { pendingItems } from './freshness-pending.mjs';
test('OpenAPI edits reach unchanged API wrappers', () => assert.deepEqual(affectedPages({'api.mdx': '---\nopenapi: GET /calls\n---', 'guide.mdx': 'Guide'}, ['openapi.json']).pages, ['api']));
test('shared content and media changes propagate transitively', () => {
  const files = {'guide.mdx': 'import X from "/snippets/x.tsx"', 'snippets/x.tsx': '"/assets/a.png"'};
  assert.deepEqual(affectedPages(files, ['assets/a.png']).pages, ['guide']);
});
test('navigation changes conservatively require page review', () => assert.deepEqual(affectedPages({'a.mdx':'A'}, ['docs.json']).pages, ['a']));
test('two gaps on one page remain independent', () => {
  const config = {reviewWindows:[{id:'w', reviewedOn:'2026-09-07', dispositions:[
    {id:'a',status:'needs-doc-update',pages:['page']}, {id:'b',status:'needs-doc-update',pages:['page']},
    {id:'fix',status:'docs-updated',pages:['page'],resolves:['w/a']}]}]};
  assert.deepEqual(pendingItems(config).map(x=>x.id), ['w/b']);
  config.resolutions = [{id:'repair-b',issue:'DOC-1',note:'Verified fix',reviewedOn:'2026-09-07',pages:['page'],resolves:['w/b']}];
  assert.deepEqual(pendingItems(config), []);
  config.resolutions[0].resolves = ['missing'];
  assert.throws(()=>pendingItems(config), /unknown/);
});
test('ordinary page update cannot silently close pending work', () => {
  assert.equal(pendingItems({reviewWindows:[{id:'w',dispositions:[{id:'a',status:'needs-doc-update',pages:['p']},{id:'b',status:'docs-updated',pages:['p']}]}]}).length, 1);
});

test('metadata edits cannot hide an indirectly affected page',()=>{
 const result=affectedPages({'api.mdx':'openapi: GET /calls'},['api.mdx','openapi.json']);
 assert.ok(result.reasons['api.mdx'].includes('openapi.json'));
});
test('cyclic shared imports terminate',()=>{
 const result=affectedPages({'a.tsx':'"/b.tsx"','b.tsx':'"/a.tsx"','p.mdx':'"/a.tsx"'},['a.tsx']);
 assert.deepEqual(result.pages,['p']);
});

test('extensionless relative imports are followed',()=>assert.deepEqual(affectedPages({'guide.mdx':"import X from './snippet'",'snippet.tsx':'content'},['snippet.tsx']).pages,['guide']));
