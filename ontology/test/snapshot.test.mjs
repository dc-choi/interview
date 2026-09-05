import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';
import { getRepoState, readBlob } from '../src/repository.mjs';
import { sha256 } from '../src/core.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ontology-snapshot-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  mkdirSync(join(repo, 'tech'), { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
  git('init');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  const write = (path, text) => { mkdirSync(join(repo, path, '..'), { recursive: true }); writeFileSync(join(repo, path), text); };
  const commit = () => { git('add', '.'); git('commit', '-m', 'fixture'); };
  write('tech/A.md', '---\naliases: [Alpha]\n---\n# Source\n본문 [[B#Target]] [[Missing]]\n');
  write('tech/B.md', '# Target\n원문 내용\n');
  commit();
  return { root, repo, cacheDir, git, write, commit };
}

test('snapshots are deterministic, source-backed, and reproducible', (t) => {
  const options = fixture(t);
  const first = buildSnapshot(options);
  const second = buildSnapshot(options);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(second.reused, true);
  const snapshot = loadSnapshot(options);
  assert.equal(snapshot.entities.filter((entity) => entity.type === 'Document').length, 2);
  assert.equal(snapshot.relations.filter((edge) => edge.predicate === 'links_to').length, 1);
  assert.equal(snapshot.manifest.coverage_gaps[0].unresolved_target, 'Missing');
  for (const unit of snapshot.entities.filter((entity) => entity.anchor)) {
    const bytes = readBlob(options.repo, snapshot.manifest.revision, unit.source_uri);
    assert.equal(unit.content_hash, `sha256:${sha256(bytes.subarray(unit.anchor.start_byte, unit.anchor.end_byte))}`);
    assert.match(unit.source_updated_at, /^\d{4}-\d{2}-\d{2}T/);
  }
});

test('dirty builds require explicit committed-only mode and never read dirty or untracked text', (t) => {
  const options = fixture(t);
  options.write('tech/B.md', '# Dirty heading\nnot committed\n');
  options.write('tech/Untracked.md', '# Untracked secret\n');
  assert.throws(() => buildSnapshot(options), { code: 'unindexed_worktree' });
  buildSnapshot({ ...options, committedOnly: true });
  const snapshot = loadSnapshot(options);
  assert.equal(getRepoState(options.repo).dirty, true);
  assert.equal(snapshot.entities.some((entity) => entity.label === 'Dirty heading'), false);
  assert.equal(snapshot.entities.some((entity) => entity.source_uri.endsWith('Untracked.md')), false);
});

test('symlinks and instruction loaders are excluded; cache cannot be stored inside source', (t) => {
  const options = fixture(t);
  options.write('tech/AGENTS.md', '# Instruction\n');
  symlinkSync('B.md', join(options.repo, 'tech/Symlink.md'));
  options.commit();
  const result = buildSnapshot(options);
  assert.equal(result.counts.documents, 2);
  assert.throws(() => buildSnapshot({ ...options, cacheDir: join(options.repo, '.cache') }), { code: 'invalid_cache_path' });
  for (const cacheDir of ['/', homedir(), options.root]) {
    assert.throws(() => buildSnapshot({ ...options, cacheDir }), { code: 'invalid_cache_path' });
  }
});

test('corrupt artifacts and unsafe active pointers are never served', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  const artifact = join(options.cacheDir, 'snapshots', fingerprint, 'entities.jsonl');
  writeFileSync(artifact, readFileSync(artifact) + '{}\n');
  assert.throws(() => loadSnapshot(options), { code: 'snapshot_integrity_error' });
  assert.throws(() => buildSnapshot(options), { code: 'snapshot_integrity_error' });
  writeFileSync(join(options.cacheDir, 'active.json'), JSON.stringify({ fingerprint: '../../escape', manifest_hash: 'a'.repeat(64) }));
  assert.throws(() => loadSnapshot(options), { code: 'snapshot_integrity_error' });
});

test('rename and deletion replace source records instead of leaving stale edges', (t) => {
  const options = fixture(t);
  const before = buildSnapshot(options);
  options.git('mv', 'tech/B.md', 'tech/Renamed.md');
  options.commit();
  const after = buildSnapshot(options);
  assert.notEqual(before.fingerprint, after.fingerprint);
  const snapshot = loadSnapshot(options);
  assert.equal(snapshot.entities.some((entity) => entity.source_uri === 'tech/B.md'), false);
  assert.equal(snapshot.relations.some((edge) => edge.predicate === 'links_to'), false);
  assert.equal(snapshot.manifest.coverage_gaps.some((gap) => gap.unresolved_target === 'B#Target'), true);
});

test('ambiguous headings and candidate assertions are reported without guessed edges', (t) => {
  const options = fixture(t);
  options.write('tech/B.md', '# Target\none\n# Target\ntwo\n');
  options.write('tech/C.md', '---\nontology_relations:\n  - predicate: verified_by\n    target: anything\n    verification: candidate\n---\n# Candidate\n');
  options.commit();
  buildSnapshot(options);
  const snapshot = loadSnapshot(options);
  assert.equal(snapshot.relations.some((edge) => edge.predicate === 'verified_by'), false);
  assert.equal(snapshot.entities.some((entity) => entity.type === 'RelationAssertion'), false);
  assert.equal(snapshot.relations.some((edge) => edge.object.includes('frontmatter.ontology_relations')), false);
  assert.equal(snapshot.manifest.coverage_gaps.some((gap) => gap.reason === 'ambiguous_anchor'), true);
});

test('relative links resolve inside the repository without clamping traversal to its root', (t) => {
  const options = fixture(t);
  options.write('tech/nested/C.md', '# Links\n[[../B#Target]] [[../../../tech/B#Target]]\n');
  options.commit();
  buildSnapshot(options);
  const snapshot = loadSnapshot(options);
  const doc = snapshot.entities.find((entity) => entity.type === 'Document' && entity.source_uri === 'tech/nested/C.md');
  assert.equal(snapshot.relations.filter((edge) => edge.subject === doc.id && edge.predicate === 'links_to').length, 1);
  assert.equal(snapshot.manifest.coverage_gaps.some((gap) => gap.reason === 'invalid_link_path'), true);
});

test('canonical relation IDs survive cloning the same vault into another directory', (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const target = loadSnapshot(options).entities.find((entity) => entity.type === 'Document' && entity.source_uri === 'tech/B.md');
  options.write('tech/C.md', `---\nontology_relations:\n  - predicate: verified_by\n    target: '${target.id}'\n---\n# Assertion\n`);
  options.commit();
  buildSnapshot(options);
  const original = loadSnapshot(options);
  const clone = join(options.root, 'another-checkout');
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', options.repo, clone]);
  const cloneOptions = { repo: clone, cacheDir: join(options.root, 'clone-cache') };
  buildSnapshot(cloneOptions);
  const copied = loadSnapshot(cloneOptions);
  assert.deepEqual(copied.entities.map((entity) => entity.id), original.entities.map((entity) => entity.id));
  assert.deepEqual(copied.relations, original.relations);
  assert.equal(copied.relations.filter((edge) => edge.predicate === 'verified_by').length, 1);
  assert.notEqual(copied.fingerprint, original.fingerprint);
  assert.doesNotThrow(() => buildSnapshot({ repo: clone, cacheDir: options.cacheDir }));
  assert.throws(() => loadSnapshot(options), { code: 'snapshot_integrity_error' });
  assert.doesNotThrow(() => buildSnapshot(options));
});

test('literal slash headings resolve without confusing nested heading paths', (t) => {
  const options = fixture(t);
  options.write('tech/B.md', '# A/B\n# A\n## B\n#\nempty heading\n');
  options.write('tech/A.md', '# Source\n[[B#A/B]]\n');
  options.commit();
  buildSnapshot(options);
  const snapshot = loadSnapshot(options);
  const edge = snapshot.relations.find((edge) => edge.predicate === 'links_to');
  assert.deepEqual(snapshot.entities.find((entity) => entity.id === edge.object).anchor.heading_path, ['A/B']);
});

test('shallow history is rejected before publishing misleading source update times', (t) => {
  const options = fixture(t);
  options.write('tech/C.md', '# Later\n');
  options.commit();
  const clone = join(options.root, 'shallow');
  execFileSync('git', ['clone', '--quiet', '--depth', '1', `file://${options.repo}`, clone]);
  assert.throws(() => buildSnapshot({ repo: clone, cacheDir: join(options.root, 'shallow-cache') }),
    { code: 'shallow_history_unsupported' });
});

test('wiki targets preserve literal percent headings and never treat H1 labels as filenames', (t) => {
  const options = fixture(t);
  options.write('tech/B.md', '# Shared\n## CPU 100%\nbody\n');
  options.write('tech/A.md', '# Source\n[[B#CPU 100%]] [[Shared]]\n');
  options.commit();
  buildSnapshot(options);
  const snapshot = loadSnapshot(options);
  assert.equal(snapshot.relations.filter((edge) => edge.predicate === 'links_to').length, 1);
  assert.equal(snapshot.manifest.coverage_gaps.some((gap) => gap.unresolved_target === 'Shared'), true);
});

test('invalid Git path encoding fails instead of publishing an unreadable source URI', (t) => {
  const options = fixture(t);
  // Construct Git objects directly because some filesystems reject such names.
  const withInput = (args, input) => execFileSync('git', ['-C', options.repo, ...args], { input }).toString().trim();
  const blob = withInput(['hash-object', '-w', '--stdin'], '# Content\n');
  const entry = Buffer.concat([Buffer.from(`100644 blob ${blob}\t`), Buffer.from([255]), Buffer.from('.md\0')]);
  const subtree = withInput(['mktree', '-z'], entry);
  const tree = withInput(['mktree', '-z'], `040000 tree ${subtree}\ttech\0`);
  const revision = options.git('commit-tree', tree, '-p', 'HEAD', '-m', 'invalid path fixture');
  options.git('update-ref', 'HEAD', revision);
  assert.throws(() => buildSnapshot({ ...options, committedOnly: true }), { code: 'invalid_source_path_encoding' });
});

test('run log failure does not reverse successful atomic snapshot activation', (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  rmSync(join(options.cacheDir, 'runs.jsonl'));
  mkdirSync(join(options.cacheDir, 'runs.jsonl'));
  options.write('tech/C.md', '# New revision\n');
  options.commit();
  const result = buildSnapshot(options);
  assert.deepEqual(result.warnings, ['run_log_unavailable']);
  assert.equal(loadSnapshot(options).manifest.revision, getRepoState(options.repo).revision);
});

test('failed extraction preserves the previous verified active snapshot', (t) => {
  const options = fixture(t);
  const before = buildSnapshot(options);
  options.write('tech/C.md', Buffer.from([35, 32, 255, 10]));
  options.commit();
  assert.throws(() => buildSnapshot(options), { code: 'invalid_source_encoding' });
  assert.equal(loadSnapshot(options).fingerprint, before.fingerprint);
});
