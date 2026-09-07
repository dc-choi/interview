import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { parseArguments } from '../src/cli.mjs';
import { sha256 } from '../src/core.mjs';

const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'context-read-mcp-'));
  const repo = join(root, 'repo');
  const cache = join(root, 'cache');
  mkdirSync(join(repo, 'tech'), { recursive: true });
  const content = '# Long Rule\n\n' + '배경 설명 🙂 "quoted" \\ slash\n'.repeat(120)
    + '\nException: verify the original source before acting.\n';
  writeFileSync(join(repo, 'tech/rule.md'), content);
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('add', '.');
  git('commit', '-qm', 'fixture');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { repo, cache, content, git };
}

async function connect(t, item) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, 'serve', '--repo', item.repo, '--cache', item.cache, '--allow', 'tech', '--committed-only'],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'evidence-read-test', version: '0.1.0' });
  await client.connect(transport);
  t.after(() => transport.close());
  return async (name, args) => client.request({ method: 'tools/call', params: { name, arguments: args } }, CallToolResultSchema);
}

const receipt = (unit) => ({ evidence_unit_id: unit.id, source_revision: unit.source_revision, content_hash: unit.content_hash });

test('MCP reads every UTF-8 page after a truncated lookup without changing the source receipt', async (t) => {
  const item = fixture(t);
  const call = await connect(t, item);
  const found = await call('context_lookup', { query: 'Long Rule', scope: ['tech'], max_bytes: 24000 });
  const unit = found.structuredContent.evidence_units.find((entry) => entry.anchor.heading_path.at(-1) === 'Long Rule');
  assert.ok(unit.truncated);
  assert.doesNotMatch(unit.excerpt, /Exception:/);
  let offset = 0;
  let text = '';
  let pages = 0;
  do {
    const response = await call('context_read', { ...receipt(unit), offset_bytes: offset, max_bytes: 2200 });
    assert.equal(response.isError, undefined);
    const page = response.structuredContent;
    assert.deepEqual(JSON.parse(response.content[0].text), page);
    assert.equal(page.budget.used_bytes, Buffer.byteLength(JSON.stringify(page)));
    assert.ok(page.budget.used_bytes <= 2200);
    assert.equal(page.evidence_unit.content_hash, unit.content_hash);
    assert.equal(page.pagination.offset_bytes, offset);
    text += page.evidence_unit.excerpt;
    pages += 1;
    assert.ok(pages < 100);
    if (page.pagination.complete) {
      assert.equal(page.pagination.next_offset_bytes, null);
      break;
    }
    assert.ok(page.pagination.next_offset_bytes > offset);
    offset = page.pagination.next_offset_bytes;
  } while (true);
  assert.ok(pages > 1);
  assert.equal(text, item.content);
  assert.equal('sha256:' + sha256(text), unit.content_hash);
});

test('MCP can read long encoded evidence IDs emitted within the lookup output budget', async (t) => {
  const item = fixture(t);
  const content = item.content.replace('# Long Rule', '# Long Rule ' + '한'.repeat(1000));
  writeFileSync(join(item.repo, 'tech/rule.md'), content);
  item.git('add', '.');
  item.git('commit', '-qm', 'long heading');
  const call = await connect(t, item);
  const found = await call('context_lookup', { query: 'Long Rule', max_bytes: 65536 });
  assert.equal(found.isError, undefined);
  const unit = found.structuredContent.evidence_units.find((entry) => Buffer.byteLength(entry.id) > 8192);
  assert.ok(unit?.truncated);
  assert.ok(found.structuredContent.budget.used_bytes <= 65536);
  const response = await call('context_read', { ...receipt(unit), max_bytes: 65536 });
  assert.equal(response.isError, undefined);
  const page = response.structuredContent;
  assert.equal(page.pagination.complete, true);
  assert.equal(page.evidence_unit.excerpt, content);
  assert.equal('sha256:' + sha256(content), unit.content_hash);
  assert.equal(page.budget.used_bytes, Buffer.byteLength(JSON.stringify(page)));
  assert.ok(page.budget.used_bytes <= 65536);
});

test('MCP evidence reads reject stale receipts, hash changes and host path overrides', async (t) => {
  const item = fixture(t);
  const call = await connect(t, item);
  const found = await call('context_lookup', { query: 'Long Rule', scope: ['tech'] });
  const unit = found.structuredContent.evidence_units.find((entry) => entry.anchor.heading_path.at(-1) === 'Long Rule');
  for (const extra of [{ repo: '/cannot-override' }, { source_uri: 'outside.md' }, { content_hash: 'bad' }]) {
    assert.equal((await call('context_read', { ...receipt(unit), ...extra })).isError, true);
  }
  const changed = item.content + 'Changed decision.\n';
  writeFileSync(join(item.repo, 'tech/rule.md'), changed);
  const dirty = await call('context_read', receipt(unit));
  assert.equal(dirty.isError, undefined);
  assert.doesNotMatch(dirty.structuredContent.evidence_unit.excerpt, /Changed decision/);
  assert.equal(dirty.structuredContent.index_sync[0].status, 'unindexed_worktree');
  item.git('add', '.');
  item.git('commit', '-qm', 'changed source');
  const stale = await call('context_read', receipt(unit));
  assert.equal(stale.isError, true);
  assert.equal(stale.structuredContent.error.code, 'snapshot_revision_mismatch');
  const refreshed = await call('context_lookup', { query: 'Long Rule' });
  const current = refreshed.structuredContent.evidence_units.find((entry) => entry.id === unit.id);
  const wrongHash = await call('context_read', { ...receipt(current), content_hash: unit.content_hash });
  assert.equal(wrongHash.structuredContent.error.code, 'evidence_mismatch');
  const read = await call('context_read', receipt(current));
  assert.match(read.structuredContent.evidence_unit.excerpt, /Changed decision/);
});

test('CLI read returns pinned evidence and rejects incomplete or mixed command flags', (t) => {
  const item = fixture(t);
  const base = ['--repo', item.repo, '--cache', item.cache, '--allow', 'tech'];
  const found = JSON.parse(execFileSync(process.execPath, [cli, 'lookup', ...base, '--query', 'Long Rule'], { encoding: 'utf8' }));
  const unit = found.evidence_units.find((entry) => entry.anchor.heading_path.at(-1) === 'Long Rule');
  const identity = ['--evidence-unit-id', unit.id, '--source-revision', unit.source_revision, '--content-hash', unit.content_hash];
  const read = JSON.parse(execFileSync(process.execPath, [cli, 'read', ...base, ...identity, '--max-bytes', '24000'], { encoding: 'utf8' }));
  assert.equal(read.evidence_unit.excerpt, item.content);
  assert.equal(read.pagination.complete, true);
  for (const args of [
    ['read', ...base], ['read', ...base, ...identity, '--query', 'invalid'],
    ['read', ...base, ...identity, '--scope', 'tech'],
    ['read', ...base, ...identity, '--offset-bytes', '0', '--offset-bytes', '1'],
    ['lookup', ...base, '--query', 'Long Rule', '--offset-bytes', '0'],
    ['status', '--max-bytes', '24000'],
  ]) assert.throws(() => parseArguments(args));
  const invalid = spawnSync(process.execPath, [cli, 'read', ...base, ...identity, '--offset-bytes', '-1'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
});
