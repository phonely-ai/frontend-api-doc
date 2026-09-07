import test from 'node:test';
import assert from 'node:assert/strict';
import {questionRequest,evaluateResponses} from './check-docs-questions.mjs';
const catalog={cases:[{id:'q',question:'How?',mode:'docs',sections:[{page:'p',heading:'Task'}],requiredFacts:['A'],forbiddenClaims:['B']}]};
test('missing sections and stale evaluations fail',()=>{
 assert.throws(()=>questionRequest(catalog,()=> '## Other'),/missing/);
 const request=questionRequest(catalog,()=> '## Task');
 assert.throws(()=>evaluateResponses(request,{digest:'old'}),/stale/);
});
test('retrieval and answer correctness are graded separately',()=>{
 const request=questionRequest(catalog,()=> '## Task');
 const response={digest:request.digest,runId:'answer-session',reviewerSession:'review-session',cases:[{id:'q',answer:'A',retrievedSections:[],facts:[{index:0,pass:true,reason:'Fact supported'}],misconceptions:[{index:0,pass:true,reason:'No false claim'}]}]};
 assert.deepEqual(evaluateResponses(request,response)[0],{id:'q',retrievalPass:false,answerPass:true,pass:false});
 response.cases[0].retrievedSections=[{page:'p',heading:'Task'}];assert.equal(evaluateResponses(request,response)[0].pass,true);
 response.cases[0].facts[0].pass=false;assert.equal(evaluateResponses(request,response)[0].pass,false);
});
