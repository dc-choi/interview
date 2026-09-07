import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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
  const root = mkdtempSync(join(tmpdir(), 'context-outline-mcp-'));
  const repo = join(root, 'repo');
  const cache = join(root, 'cache');
  const content = [
    '# Widget Policy',
    '',
    '## Matching Rule',
    '',
    'The narrow lookup phrase identifies this rule.',
    '',
    '## Missed Detail',
    '',
    'Read this full pinned section before changing the widget.',
    '',
    '## Closing Rule',
    '',
    'A final source-backed condition.',
    '',
  ].join('\n');
  mkdirSync(join(repo, 'tech'), { recursive: true });
  writeFileSync(join(repo, 'tech', 'widget.md'), content);
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
  const client = new Client({ name: 'outline-mcp-test', version: '0.1.0' });
  await client.connect(transport);
  t.after(() => transport.close());
  return (name, args) => client.request({ method: 'tools/call', params: { name, arguments: args } }, CallToolResultSchema);
}

function documentFrom(lookup) {
  return lookup.entities.find((entity) => entity.type === 'Document');
}

test('MCP outlines every pinned section and reads one lookup-missed receipt', async (t) => {
  const item = fixture(t);
  const call = await connect(t, item);
  const lookup = (await call('context_lookup', { query: 'narrow lookup phrase', scope: ['tech'] })).structuredContent;
  const document = documentFrom(lookup);
  assert.ok(document);
  assert.ok(lookup.evidence_units.some((unit) => unit.anchor.heading_path.at(-1) === 'Matching Rule'));
  const initialIds = new Set(lookup.evidence_units.map((unit) => unit.id));
  const sections = [];
  let offset = 0;
  do {
    const response = await call('context_outline', {
      document_id: document.id,
      source_revision: lookup.index_sync[0].revision,
      offset_sections: offset,
      max_bytes: 1600,
    });
    assert.equal(response.isError, undefined);
    const page = response.structuredContent;
    assert.equal(page.budget.used_bytes, Buffer.byteLength(JSON.stringify(page)));
    assert.ok(page.budget.used_bytes <= 1600);
    assert.equal(page.pagination.offset_sections, offset);
    sections.push(...page.sections);
    if (page.pagination.complete) break;
    assert.ok(page.pagination.next_offset_sections > offset);
    offset = page.pagination.next_offset_sections;
  } while (true);
  const missed = sections.find((section) => section.anchor.heading_path.at(-1) === 'Missed Detail'
    && !initialIds.has(section.id));
  assert.ok(missed);
  const read = await call('context_read', {
    evidence_unit_id: missed.id,
    source_revision: missed.source_revision,
    content_hash: missed.content_hash,
  });
  const raw = Buffer.from(item.content).subarray(missed.anchor.start_byte, missed.anchor.end_byte).toString('utf8');
  assert.equal(read.structuredContent.evidence_unit.excerpt, raw);
  assert.equal(`sha256:${sha256(raw)}`, missed.content_hash);
});

test('MCP outline refuses overrides and stale revisions while excluding dirty text', async (t) => {
  const item = fixture(t);
  const call = await connect(t, item);
  const lookup = (await call('context_lookup', { query: 'narrow lookup phrase' })).structuredContent;
  const document = documentFrom(lookup);
  const args = { document_id: document.id, source_revision: lookup.index_sync[0].revision };
  for (const extra of [{ repo: '/cannot-override' }, { scope: ['fit'] }, { source_uri: 'tech/other.md' }]) {
    assert.equal((await call('context_outline', { ...args, ...extra })).isError, true);
  }
  writeFileSync(join(item.repo, 'tech', 'widget.md'), `${item.content}## Uncommitted\n\nPRIVATE OUTLINE TEXT\n`);
  const dirty = await call('context_outline', args);
  assert.equal(dirty.isError, undefined);
  assert.equal(dirty.structuredContent.index_sync[0].status, 'unindexed_worktree');
  assert.doesNotMatch(JSON.stringify(dirty.structuredContent), /PRIVATE OUTLINE TEXT/);
  item.git('add', '.');
  item.git('commit', '-qm', 'changed source');
  const stale = await call('context_outline', args);
  assert.equal(stale.isError, true);
  assert.equal(stale.structuredContent.error.code, 'snapshot_revision_mismatch');
});

test('CLI outline returns a pinned document and rejects incomplete or mixed flags', (t) => {
  const item = fixture(t);
  const base = ['--repo', item.repo, '--cache', item.cache, '--allow', 'tech'];
  const lookup = JSON.parse(execFileSync(process.execPath, [cli, 'lookup', ...base, '--query', 'narrow lookup phrase'], { encoding: 'utf8' }));
  const document = documentFrom(lookup);
  const outline = JSON.parse(execFileSync(process.execPath, [cli, 'outline', ...base,
    '--document-id', document.id, '--source-revision', lookup.index_sync[0].revision], { encoding: 'utf8' }));
  assert.equal(outline.document.id, document.id);
  assert.equal(outline.document.source_revision, lookup.index_sync[0].revision);
  assert.ok(outline.sections.length > 0);
  for (const args of [
    ['outline', ...base],
    ['outline', ...base, '--document-id', document.id],
    ['outline', ...base, '--document-id', document.id, '--source-revision', lookup.index_sync[0].revision, '--query', 'invalid'],
    ['outline', ...base, '--document-id', document.id, '--source-revision', lookup.index_sync[0].revision, '--offset-sections', '0', '--offset-sections', '1'],
  ]) assert.throws(() => parseArguments(args));
});
