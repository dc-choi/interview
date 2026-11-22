import assert from 'node:assert/strict';
import childProcess, { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { parseArguments } from '../src/cli.mjs';
import { createContextServer } from '../src/server.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.resolve(here, '../src/cli.mjs');

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'context-ontology-mcp-'));
  const repo = path.join(root, 'repo');
  const cache = path.join(root, 'cache');
  await mkdir(path.join(repo, 'tech'), { recursive: true });
  await writeFile(path.join(repo, 'tech', 'Transactional-Outbox.md'), [
    '---', 'tags: [outbox, event]', 'aliases: [Transactional Outbox]', '---',
    '# Transactional outbox',
    'Store the domain change and event record in one database transaction. [[Idempotency]]', '',
  ].join('\n'));
  git(repo, ['init', '--quiet']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  git(repo, ['config', 'user.name', 'Test']);
  git(repo, ['add', '.']);
  git(repo, ['commit', '--quiet', '-m', 'fixture']);
  return { root, repo, cache };
}

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

async function connect(args) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, 'serve', ...args],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'context-ontology-test', version: '0.1.0' });
  await client.connect(transport);
  return { client, transport };
}

async function close(connection) {
  await connection.transport.close();
}

test('MCP server lists read-only lookup and evidence tools and returns structured data', async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const connection = await connect(['--repo', item.repo, '--cache', item.cache, '--allow', 'tech']);
  t.after(() => close(connection));

  const listed = await connection.client.request({ method: 'tools/list', params: {} }, ListToolsResultSchema);
  assert.deepEqual(listed.tools.map((tool) => tool.name).sort(),
    ['context_concept', 'context_lookup', 'context_outline', 'context_read', 'context_search']);
  for (const tool of listed.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.equal(tool.inputSchema.additionalProperties, false);
  }

  const result = await connection.client.request({
    method: 'tools/call',
    params: { name: 'context_lookup', arguments: { query: 'transactional outbox', scope: ['tech'], depth: 1, max_bytes: 8000 } },
  }, CallToolResultSchema);
  assert.equal(result.isError, undefined);
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  assert.equal(result.structuredContent.result_status, 'ok');
  assert.ok(result.structuredContent.evidence_units.length > 0);
});

test('MCP rejects unexpected arguments and blank lookup queries', async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const connection = await connect(['--repo', item.repo, '--cache', item.cache]);
  t.after(() => close(connection));

  for (const args of [{ query: 'outbox', repo: '/cannot-override' }, { query: ' \t\n' },
    { query: 'outbox', conditions: [' '] }, { query: 'outbox', conditions: ['한'.repeat(342)] }]) {
    const result = await connection.client.request({
      method: 'tools/call',
      params: { name: 'context_lookup', arguments: args },
    }, CallToolResultSchema);
    assert.equal(result.isError, true);
    if (args.conditions) assert.equal(result.structuredContent.error.code, 'invalid_conditions');
    else if (!args.repo) assert.equal(result.structuredContent.error.code, 'invalid_query');
  }
});

test('MCP and CLI accept condition hints without replacing the original query', async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const connection = await connect(['--repo', item.repo, '--cache', item.cache, '--allow', 'tech']);
  t.after(() => close(connection));
  const args = { query: 'transactional outbox', conditions: ['database transaction'], scope: ['tech'], max_bytes: 8000 };
  const response = await connection.client.request({ method: 'tools/call',
    params: { name: 'context_lookup', arguments: args } }, CallToolResultSchema);
  assert.equal(response.isError, undefined);
  assert.equal(response.structuredContent.query, args.query);
  assert.ok(response.structuredContent.evidence_units.some((unit) => unit.excerpt.includes('one database transaction')));
  const result = JSON.parse(execFileSync(process.execPath, [cli, 'lookup', '--repo', item.repo,
    '--cache', item.cache, '--allow', 'tech', '--query', args.query,
    '--condition', args.conditions[0], '--max-bytes', '8000'], { encoding: 'utf8' }));
  assert.deepEqual(result, response.structuredContent);
  assert.deepEqual(parseArguments(['lookup', '--query', 'question', '--condition', 'first', '--condition', 'second']).conditions,
    ['first', 'second']);
  assert.throws(() => parseArguments(['search', '--query', 'question', '--condition', 'first']));
});

test('committed-only MCP server can build and serve HEAD from a dirty worktree', async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  await writeFile(path.join(item.repo, 'tech', 'Uncommitted.md'), '# UNCOMMITTED PRIVATE TEXT\n');
  const connection = await connect(['--repo', item.repo, '--cache', item.cache, '--committed-only']);
  t.after(() => close(connection));

  const result = await connection.client.request({
    method: 'tools/call',
    params: { name: 'context_lookup', arguments: { query: 'transactional outbox' } },
  }, CallToolResultSchema);
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.index_sync[0].status, 'unindexed_worktree');
  assert.equal(result.structuredContent.result_status, 'ok');
  assert.ok(result.structuredContent.evidence_units.some((unit) => unit.source_uri === 'tech/Transactional-Outbox.md'));
  assert.doesNotMatch(JSON.stringify(result.structuredContent), /UNCOMMITTED PRIVATE TEXT/);
});

test('each MCP tool call checks the repository state once, and again on the next call', async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const server = createContextServer({ repo: item.repo, cacheDir: item.cache, allowlist: ['tech'], scopes: ['tech'] });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: 'context-ontology-test', version: '0.1.0' });
  await client.connect(clientSide);
  t.after(() => client.close());
  const call = (name, args) => client.request({ method: 'tools/call', params: { name, arguments: args } }, CallToolResultSchema);
  const found = (await call('context_lookup', { query: 'transactional outbox' })).structuredContent;
  const unit = found.evidence_units[0];
  const document = found.entities.find((entity) => entity.type === 'Document');
  const run = childProcess.execFileSync;
  const checks = [];
  t.mock.method(childProcess, 'execFileSync', (file, args, ...rest) => {
    if (file === 'git' && ['rev-parse', 'status'].includes(args[2])) checks.push(args.slice(2).join(' '));
    return run(file, args, ...rest);
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  for (const [name, args] of [
    ['context_lookup', { query: 'transactional outbox' }],
    ['context_search', { query: 'transactional outbox' }],
    ['context_concept', { concept: 'outbox' }],
    ['context_read', { evidence_unit_id: unit.id, source_revision: unit.source_revision, content_hash: unit.content_hash }],
    ['context_outline', { document_id: document.id, source_revision: unit.source_revision }],
  ]) {
    checks.length = 0;
    const result = await call(name, args);
    assert.equal(result.isError, undefined, name);
    assert.equal(result.structuredContent.index_sync[0].status, 'synced', name);
    assert.deepEqual(checks, ['rev-parse --show-toplevel --verify HEAD^{commit}',
      'status --porcelain=v1 -z --untracked-files=normal'], name);
  }
  await writeFile(path.join(item.repo, 'tech', 'Untracked.md'), '# Untracked\n');
  const dirty = await call('context_lookup', { query: 'transactional outbox' });
  assert.equal(dirty.structuredContent.index_sync[0].status, 'unindexed_worktree');
});

test('serve exits cleanly on stdin EOF without emitting a JSON representation of the server', async (t) => {
  const item = await fixture();
  t.after(() => rm(item.root, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [cli, 'serve', '--repo', item.repo, '--cache', item.cache], {
    input: '', encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.doesNotMatch(result.stderr, /circular structure/i);
});
