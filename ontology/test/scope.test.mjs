import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { sha256 } from '../src/core.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';

const sources = {
  'README.md': '# Vault navigation\n[[Business-Model]]\n',
  'tech/Technical-Pattern.md': '# Technical pattern\n[[Business-Model]]\n',
  'biz/Business-Model.md': '# Business model\n[[Technical-Pattern]]\n',
  'econ/Economic-Cycle.md': '# Economic cycle\nEconomic observations.\n',
  'fit/Career-Reflection.md': '# Career reflection\nPast decisions are dated records.\n',
  'ontology/Operations.md': '# Ontology operations\n[[Operations]] [[Technical-Pattern]]\n',
};

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ontology-scope-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  const write = (file, text) => {
    const target = join(repo, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  for (const [file, text] of Object.entries(sources)) write(file, text);
  for (const file of ['AGENTS.md', 'fit/CLAUDE.md', '.agents/skills/example/SKILL.md',
    '.claude/skills/example/SKILL.md', 'ontology/example.mjs']) {
    write(file, '# Excluded instruction text\n');
  }
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });
  git('init', '--quiet');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('add', '.');
  git('commit', '--quiet', '-m', 'fixture');
  return { repo, cacheDir };
}

async function connect(options, allow = []) {
  const client = new Client({ name: 'vault-scope-test', version: '0.1.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../src/cli.mjs', import.meta.url)), 'serve',
      '--repo', options.repo, '--cache', options.cacheDir,
      ...allow.flatMap((scope) => ['--allow', scope])],
    stderr: 'pipe',
  });
  await client.connect(transport);
  return client;
}

test('default snapshots include knowledge domains and resolve cross-domain and self links', (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const snapshot = loadSnapshot(options);
  const documents = snapshot.entities.filter((entity) => entity.type === 'Document');
  assert.deepEqual(documents.map((entity) => entity.source_uri).sort(), Object.keys(sources).sort());
  const byPath = new Map(documents.map((entity) => [entity.source_uri, entity.id]));
  for (const [from, to] of [
    ['tech/Technical-Pattern.md', 'biz/Business-Model.md'],
    ['biz/Business-Model.md', 'tech/Technical-Pattern.md'],
    ['ontology/Operations.md', 'ontology/Operations.md'],
  ]) {
    assert.ok(snapshot.relations.some((edge) => edge.predicate === 'links_to'
      && edge.subject === byPath.get(from) && edge.object === byPath.get(to)));
  }
  assert.equal(snapshot.manifest.coverage_gaps.length, 0);
});

test('CLI lookup with an explicit allowlist does not request other default domains', (t) => {
  const options = fixture(t);
  for (const extra of [[], ['--depth', '2', '--max-bytes', '8000']]) {
    const output = execFileSync(process.execPath, [
      fileURLToPath(new URL('../src/cli.mjs', import.meta.url)), 'lookup',
      '--repo', options.repo, '--cache', options.cacheDir,
      '--allow', 'tech', '--query', 'Technical pattern', ...extra,
    ], { encoding: 'utf8' });
    const payload = JSON.parse(output);
    assert.deepEqual(payload.index_sync[0].indexed_paths, ['tech']);
    assert.equal(payload.index_sync[0].requested_scope_indexed, true);
    assert.deepEqual(payload.index_sync[0].errors, []);
    assert.ok(payload.evidence_units.some((unit) => unit.source_uri === 'tech/Technical-Pattern.md'));
    assert.ok(payload.evidence_units.every((unit) => unit.source_uri.startsWith('tech/')));
    if (extra.length) {
      assert.equal(payload.traversal.depth, 2);
      assert.equal(payload.budget.effective_max_bytes, 8000);
    }
  }
});

test('default MCP serves every domain while explicit scopes and allowlists stay bounded', async (t) => {
  const options = fixture(t);
  const client = await connect(options);
  try {
    for (const [file, markdown] of Object.entries(sources)) {
      const scope = file.includes('/') ? file.split('/')[0] : file;
      const result = await client.callTool({ name: 'context_lookup', arguments: {
        query: markdown.split('\n')[0].slice(2), scope: [scope], depth: 2, max_bytes: 24000,
      } });
      assert.equal(result.isError, undefined);
      const payload = result.structuredContent;
      assert.equal(payload.index_sync[0].requested_scope_indexed, true);
      assert.ok(payload.evidence_units.some((unit) => unit.source_uri === file));
      assert.ok(payload.evidence_units.every((unit) => unit.source_uri === scope
        || unit.source_uri.startsWith(`${scope}/`)));
    }
    const result = await client.callTool({ name: 'context_lookup', arguments: {
      query: 'Ontology operations', depth: 2, max_bytes: 24000,
    } });
    const payload = result.structuredContent;
    assert.ok(payload.evidence_units.some((unit) => unit.source_uri === 'ontology/Operations.md'));
    assert.ok(payload.evidence_units.some((unit) => unit.source_uri === 'tech/Technical-Pattern.md'));
    assert.equal(new Set(payload.evidence_units.map((unit) => unit.id)).size, payload.evidence_units.length);
    assert.ok(Buffer.byteLength(JSON.stringify(payload)) <= 24000);
  } finally {
    await client.close();
  }

  const restricted = await connect(options, ['tech']);
  try {
    const result = await restricted.callTool({ name: 'context_lookup', arguments: {
      query: 'Career reflection', scope: ['fit'], max_bytes: 24000,
    } });
    assert.equal(result.structuredContent.result_status, 'insufficient_evidence');
    assert.equal(result.structuredContent.evidence_units.length, 0);
    assert.deepEqual(result.structuredContent.index_sync[0].indexed_paths, ['tech']);
  } finally {
    await restricted.close();
  }
});

test('CLI lookup with a request scope keeps the allowlist snapshot active', (t) => {
  const options = fixture(t);
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const run = (...args) => JSON.parse(execFileSync(process.execPath, [cli, ...args,
    '--repo', options.repo, '--cache', options.cacheDir], { encoding: 'utf8' }));
  const built = run('build');
  assert.equal(built.snapshot, undefined);
  const payload = run('lookup', '--scope', 'tech', '--query', 'Technical pattern');
  assert.ok(payload.evidence_units.every((unit) => unit.source_uri.startsWith('tech/')));
  assert.equal(payload.index_sync[0].fingerprint, built.fingerprint);
  const status = run('status');
  assert.equal(status.fingerprint, built.fingerprint);
  assert.deepEqual(status.manifest.indexed_paths, ['README.md', 'biz', 'econ', 'fit', 'ontology', 'tech']);
});

test('CLI status reports why no snapshot is served', (t) => {
  const options = fixture(t);
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const run = (...args) => JSON.parse(execFileSync(process.execPath, [cli, ...args,
    '--repo', options.repo, '--cache', options.cacheDir], { encoding: 'utf8' }));
  assert.equal(run('status').snapshot_status, 'index_not_built');
  const { fingerprint } = run('build');
  const directory = join(options.cacheDir, 'snapshots', fingerprint);
  const manifest = JSON.parse(readFileSync(join(directory, 'source-manifest.json')));
  const stale = `${JSON.stringify({ ...manifest, extractor_version: '0' })}\n`;
  writeFileSync(join(directory, 'source-manifest.json'), stale);
  writeFileSync(join(options.cacheDir, 'active.json'), JSON.stringify({ fingerprint, manifest_hash: sha256(stale) }));
  const status = run('status');
  assert.equal(status.manifest, null);
  assert.equal(status.snapshot_status, 'snapshot_incompatible');
});
