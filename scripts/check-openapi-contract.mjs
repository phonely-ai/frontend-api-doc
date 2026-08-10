#!/usr/bin/env node
/**
 * Validate the published OpenAPI contract beyond JSON syntax.
 *
 * This intentionally checks durable API invariants rather than attempting to
 * generate a public contract from application code. The product repositories
 * remain the implementation source of truth; this guard prevents structurally
 * incomplete or accidentally swapped public schemas from being published.
 */
import { readFileSync } from 'node:fs';

const openapi = JSON.parse(readFileSync('openapi.json', 'utf8'));
const failures = [];
const referencedSchemas = new Set();
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

function fail(message) {
  failures.push(message);
}

function resolveRef(ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return null;
  let value = openapi;
  for (const segment of ref.slice(2).split('/')) {
    value = value?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')];
  }
  return value ?? null;
}

function schemaFor(response) {
  const content = response?.content ?? {};
  return Object.values(content).find((media) => media?.schema)?.schema ?? null;
}

function dereference(schema) {
  return schema?.$ref ? resolveRef(schema.$ref) : schema;
}

function operation(method, path) {
  return openapi.paths?.[path]?.[method.toLowerCase()] ?? null;
}

function successSchema(method, path, status = '200') {
  return schemaFor(operation(method, path)?.responses?.[status]);
}

function expectRef(schema, expected, label) {
  if (schema?.$ref !== expected) fail(`${label} must use ${expected}`);
}

function expectArrayOf(schema, expectedRef, label) {
  if (schema?.type !== 'array' || schema?.items?.$ref !== expectedRef) {
    fail(`${label} must be an array of ${expectedRef}`);
  }
}

function walkRefs(value, location = 'openapi.json') {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
    if (!resolveRef(value.$ref)) fail(`${location} contains an unresolved reference: ${value.$ref}`);
    if (value.$ref.startsWith('#/components/schemas/')) referencedSchemas.add(value.$ref);
  }
  for (const [key, child] of Object.entries(value)) walkRefs(child, `${location}.${key}`);
}

walkRefs(openapi);

for (const schemaName of Object.keys(openapi.components?.schemas ?? {})) {
  const reference = `#/components/schemas/${schemaName}`;
  if (!referencedSchemas.has(reference)) fail(`components.schemas.${schemaName} is unused`);
}

for (const [path, pathItem] of Object.entries(openapi.paths ?? {})) {
  for (const [method, apiOperation] of Object.entries(pathItem ?? {})) {
    if (!HTTP_METHODS.has(method)) continue;
    const label = `${method.toUpperCase()} ${path}`;

    if (!apiOperation.summary?.trim()) fail(`${label} must have a summary`);
    if (!apiOperation.responses || Object.keys(apiOperation.responses).length === 0) {
      fail(`${label} must define responses`);
      continue;
    }

    const pathNames = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
    const parameterNames = (apiOperation.parameters ?? [])
      .filter((parameter) => parameter.in === 'path' && parameter.required === true)
      .map((parameter) => parameter.name)
      .sort();
    if (JSON.stringify(pathNames) !== JSON.stringify(parameterNames)) {
      fail(`${label} path parameters must exactly match ${pathNames.join(', ') || '(none)'}`);
    }

    if (apiOperation.requestBody) {
      const media = Object.values(apiOperation.requestBody.content ?? {});
      if (media.length === 0 || media.some((item) => !item?.schema)) {
        fail(`${label} request body must define a schema for every media type`);
      }
    }

    for (const [status, response] of Object.entries(apiOperation.responses)) {
      if (!/^2\d\d$/.test(status) || status === '204') continue;
      const schema = schemaFor(response);
      if (!schema) {
        fail(`${label} ${status} response must define a schema`);
        continue;
      }
      const root = dereference(schema);
      if (root?.type === 'object' && Object.keys(root.properties ?? {}).length > 0 && !root.required?.length) {
        fail(`${label} ${status} object response must identify its guaranteed fields`);
      }
    }

    if (label !== 'GET /list-voices') {
      const hasApiKey = (apiOperation.security ?? []).some((requirement) => 'ApiKeyAuth' in requirement);
      if (!hasApiKey) fail(`${label} must declare ApiKeyAuth`);
    }
  }
}

const getAgents = operation('POST', '/get-agents');
expectRef(
  getAgents?.requestBody?.content?.['application/json']?.schema,
  '#/components/schemas/GetAgentsRequest',
  'POST /get-agents request'
);
expectArrayOf(
  successSchema('POST', '/get-agents'),
  '#/components/schemas/AgentInfo',
  'POST /get-agents 200 response'
);
expectArrayOf(
  successSchema('GET', '/get-orgs'),
  '#/components/schemas/OrgInfo',
  'GET /get-orgs 200 response'
);
expectRef(
  successSchema('POST', '/get-call'),
  '#/components/schemas/CallSummaryResponse',
  'POST /get-call 200 response'
);
if (!operation('POST', '/get-call')?.responses?.['404']) {
  fail('POST /get-call must document its 404 response');
}
if (!(operation('GET', '/calls/{agentId}')?.parameters ?? []).some((parameter) => parameter.name === 'ab_test_id')) {
  fail('GET /calls/{agentId} must document the ab_test_id filter');
}

if (failures.length > 0) {
  console.error(`OpenAPI contract failed with ${failures.length} issue(s):\n`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const operationCount = Object.values(openapi.paths ?? {}).reduce(
  (count, pathItem) => count + Object.keys(pathItem ?? {}).filter((method) => HTTP_METHODS.has(method)).length,
  0
);
console.log(`OpenAPI contract is valid: ${operationCount} published operation(s).`);
