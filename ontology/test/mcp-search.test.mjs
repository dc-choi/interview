import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { parseArguments } from '../src/cli.mjs';

const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
const query = 'retrievalneedle';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'context-search-mcp-'));
  const repo = join(root, 'repo');
  const cache = join(root, 'cache');
  mkdirSync(join(repo, 'tech'), { recursive: true });
  for (let index = 1; index <= 25; index += 1) {
    const number = String(index).padStart(2, '0');
    writeFileSync(join(repo, 'tech', `Search-${number}.md`), [
      `# Search result ${number}`,
      '',
      `This markdown document contains ${query} for page traversal verification.`,
    ].join('\n'));
  }
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '--quiet');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('add', '.');
  git('commit', '--quiet', '-m', 'fixture');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { repo, cache };
}

async function connect(t, item) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, 'serve', '--repo', item.repo, '--cache', item.cache, '--allow', 'tech'],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'context-search-mcp-test', version: '0.1.0' });
  await client.connect(transport);
  t.after(() => transport.close());
  return client;
}

function assertEnvelope(result) {
  assert.equal(result.isError, undefined);
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
}

function assertCandidate(candidate) {
  assert.equal(candidate.document.type, 'Document');
  assert.equal(typeof candidate.document.id, 'string');
  assert.equal(typeof candidate.source_uri, 'string');
  assert.ok(Array.isArray(candidate.matched_terms));
  assert.ok(candidate.matched_terms.includes(query));
  assert.ok(candidate.best_evidence_ref === null || typeof candidate.best_evidence_ref.id === 'string');
  assert.equal('excerpt' in candidate, false);
  assert.equal('body' in candidate, false);
  assert.equal('content' in candidate, false);
}

async function call(client, args) {
  return client.request({ method: 'tools/call', params: { name: 'context_search', arguments: args } }, CallToolResultSchema);
}

test('MCP context_search pages source-backed Markdown Documents and keeps its envelope in sync', async (t) => {
  const item = fixture(t);
  const client = await connect(t, item);
  const listed = await client.request({ method: 'tools/list', params: {} }, ListToolsResultSchema);
  const tool = listed.tools.find((entry) => entry.name === 'context_search');
  assert.equal(tool?.annotations?.readOnlyHint, true);
  assert.equal(tool?.inputSchema?.additionalProperties, false);

  const first = await call(client, { query, scope: ['tech'], max_bytes: 65536 });
  assertEnvelope(first);
  const firstPage = first.structuredContent;
  assert.equal(firstPage.pagination.offset_documents, 0);
  assert.equal(firstPage.pagination.returned_documents, 20);
  assert.equal(firstPage.pagination.total_candidates, 25);
  assert.equal(firstPage.pagination.complete, false);
  assert.equal(typeof firstPage.pagination.next_cursor, 'string');
  assert.equal(firstPage.budget.used_bytes, Buffer.byteLength(JSON.stringify(firstPage)));
  assert.ok(firstPage.budget.used_bytes <= firstPage.budget.effective_max_bytes);
  firstPage.candidates.forEach(assertCandidate);

  const second = await call(client, {
    query,
    scope: ['tech'],
    cursor: firstPage.pagination.next_cursor,
    max_bytes: 24000,
  });
  assertEnvelope(second);
  const secondPage = second.structuredContent;
  assert.equal(secondPage.pagination.offset_documents, 20);
  assert.equal(secondPage.pagination.returned_documents, 5);
  assert.equal(secondPage.pagination.total_candidates, 25);
  assert.equal(secondPage.pagination.complete, true);
  assert.equal(secondPage.pagination.next_cursor, null);
  secondPage.candidates.forEach(assertCandidate);
  const paths = new Set([...firstPage.candidates, ...secondPage.candidates].map((candidate) => candidate.source_uri));
  assert.equal(paths.size, 25);
});

test('MCP search cursor accepts exact replay and rejects malformed or differently bound requests', async (t) => {
  const client = await connect(t, fixture(t));
  const first = await call(client, { query, scope: ['tech'] });
  assertEnvelope(first);
  const cursor = first.structuredContent.pagination.next_cursor;
  const replay = await call(client, { query, scope: ['tech'], cursor });
  assertEnvelope(replay);

  const malformed = await call(client, { query, scope: ['tech'], cursor: 'not-a-valid-cursor' });
  assert.equal(malformed.isError, true);
  assert.equal(malformed.structuredContent.error.code, 'invalid_cursor');
  const oversized = await call(client, { query, scope: ['tech'], cursor: 'a'.repeat(2049) });
  assert.equal(oversized.isError, true);
  assert.equal(oversized.structuredContent.error.code, 'invalid_cursor');
  const changedQuery = await call(client, { query: `${query} changed`, scope: ['tech'], cursor });
  assert.equal(changedQuery.isError, true);
  assert.equal(changedQuery.structuredContent.error.code, 'cursor_mismatch');
  const changedScope = await call(client, { query, scope: ['README.md'], cursor });
  assert.equal(changedScope.isError, true);
  assert.equal(changedScope.structuredContent.error.code, 'cursor_mismatch');
});

test('MCP search accepts a continuation when its cursor makes near-limit base arguments larger', async (t) => {
  const client = await connect(t, fixture(t));
  const longQuery = `${query} ${'x'.repeat(4096 - query.length - 1)}`;
  const scope = ['tech', ...Array.from({ length: 19 }, (_, index) => `unused-${index}/${'x'.repeat(200)}`)];
  const args = { query: longQuery, scope, max_bytes: 65536 };
  const baseBytes = Buffer.byteLength(JSON.stringify(args));
  assert.ok(baseBytes <= 8192);

  const first = await call(client, args);
  assertEnvelope(first);
  const cursor = first.structuredContent.pagination.next_cursor;
  assert.equal(typeof cursor, 'string');
  assert.ok(Buffer.byteLength(JSON.stringify({ ...args, cursor })) > 8192);
  const second = await call(client, { ...args, cursor });
  assertEnvelope(second);
  assert.equal(second.structuredContent.pagination.offset_documents, 20);
});

test('CLI search accepts its pagination arguments and retains lookup argument behavior', (t) => {
  const item = fixture(t);
  const parsed = parseArguments(['search', '--query', query, '--scope', 'tech', '--max-bytes', '24000', '--cursor', 'opaque']);
  assert.equal(parsed.command, 'search');
  assert.equal(parsed.cursor, 'opaque');
  assert.deepEqual(parsed.scopes, ['tech']);
  assert.throws(() => parseArguments(['search', '--query', query, '--depth', '1']));
  assert.throws(() => parseArguments(['lookup', '--query', query, '--cursor', 'opaque']));
  assert.deepEqual(parseArguments(['lookup', '--query', query, '--depth', '2']).command, 'lookup');

  const output = execFileSync(process.execPath, [
    cli, 'search', '--repo', item.repo, '--cache', item.cache, '--allow', 'tech', '--scope', 'tech', '--query', query,
  ], { encoding: 'utf8' });
  const payload = JSON.parse(output);
  assert.equal(payload.query, query);
  assert.equal(payload.pagination.returned_documents, 20);
  assert.equal(payload.pagination.total_candidates, 25);
});
