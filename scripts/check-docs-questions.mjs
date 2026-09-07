import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function questionRequest(catalog, readPage) {
  const ids = new Set(); const corpus = {};
  for (const item of catalog.cases) {
    if (!item.id || ids.has(item.id) || !item.question?.trim() || !['docs','live-state'].includes(item.mode) ||
        !item.requiredFacts?.length || !item.forbiddenClaims?.length || !item.sections?.length) throw new Error('Invalid or duplicate question case');
    ids.add(item.id);
    for (const section of item.sections) {
      const content = readPage(section.page); corpus[section.page] = content;
      if (!content.split(/\r?\n/).some(line => /^#{1,6} /.test(line) && line.replace(/^#{1,6} /, '') === section.heading)) throw new Error(`${item.id}: missing expected section`);
    }
  }
  return {schemaVersion:1, digest:hash({catalog,corpus}), cases:catalog.cases};
}
export function evaluateResponses(request, response) {
  if (response.digest !== request.digest) throw new Error('Evaluation is stale');
  if (!response.runId || !response.reviewerSession || response.runId === response.reviewerSession) throw new Error('Separate answer reviewer required');
  if (response.cases?.length !== request.cases.length || new Set(response.cases.map(c=>c.id)).size !== request.cases.length) throw new Error('All question cases must be evaluated');
  return request.cases.map(expected => {
    const actual = response.cases.find(item=>item.id===expected.id);
    if (!actual?.answer?.trim()) throw new Error(`${expected.id}: answer missing`);
    const grade = (rows, count) => Array.isArray(rows) && rows.length === count && rows.every((row,index)=>row.index===index && typeof row.pass==='boolean' && row.reason?.trim());
    if (!grade(actual.facts, expected.requiredFacts.length) || !grade(actual.misconceptions, expected.forbiddenClaims.length)) throw new Error(`${expected.id}: complete reasoned grading required`);
    const retrievalPass = expected.mode === 'live-state' ? actual.usedLiveTool === true : expected.sections.some(section => actual.retrievedSections?.some(found=>found.page===section.page && found.heading===section.heading));
    return {id:expected.id,retrievalPass,answerPass:actual.facts.every(row=>row.pass)&&actual.misconceptions.every(row=>row.pass),
      pass:retrievalPass&&actual.facts.every(row=>row.pass)&&actual.misconceptions.every(row=>row.pass)};
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const catalog = JSON.parse(readFileSync('evals/docs-questions.json','utf8'));
  const request = questionRequest(catalog, page=>readFileSync(`${page}.mdx`,'utf8'));
  if (process.argv.includes('--request')) console.log(JSON.stringify(request,null,2));
  else if (process.argv[2]) {
    const results=evaluateResponses(request,JSON.parse(readFileSync(process.argv[2],'utf8')));
    console.log(JSON.stringify(results,null,2));if(results.some(row=>!row.pass))process.exitCode=1;
  } else console.log(`${request.cases.length} question cases have valid source sections. Retrieval and answer quality have NOT been evaluated.`);
}
