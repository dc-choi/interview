import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { existsSync, lutimesSync, mkdtempSync, mkdirSync, utimesSync, writeFileSync, readFileSync, readlinkSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSnapshot, defaultCacheDir, loadSnapshot } from '../src/snapshot.mjs';
import { getRepoState, readBlob } from '../src/repository.mjs';
import { sha256 } from '../src/core.mjs';
import { ensureFreshSnapshot } from '../src/server.mjs';

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
  assert.equal(first.snapshot.fingerprint, first.fingerprint);
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

test('a non-empty custom cache is refused until context-ontology owns it', (t) => {
  const options = fixture(t);
  mkdirSync(options.cacheDir);
  writeFileSync(join(options.cacheDir, '.building-foreign-data'), 'keep');
  assert.throws(() => buildSnapshot(options), { code: 'invalid_cache_path' });
  assert.equal(readFileSync(join(options.cacheDir, '.building-foreign-data'), 'utf8'), 'keep');
  const lookalike = join(options.root, 'context-ontology', basename(defaultCacheDir(options.repo)));
  mkdirSync(lookalike, { recursive: true });
  writeFileSync(join(lookalike, '.building-foreign-data'), 'keep');
  assert.throws(() => buildSnapshot({ ...options, cacheDir: lookalike }), { code: 'invalid_cache_path' });
  assert.equal(readFileSync(join(lookalike, '.building-foreign-data'), 'utf8'), 'keep');
});

test('a concurrent first build waits for the ownership marker write to finish', async (t) => {
  const options = fixture(t);
  mkdirSync(options.cacheDir);
  const marker = join(realpathSync(options.cacheDir), '.context-ontology-cache');
  const observed = join(options.root, 'marker-observed');
  const content = 'interview-context-ontology-v1\n';
  writeFileSync(marker, '');
  const writer = execFile(process.execPath, ['--input-type=module', '-e', `
    import { existsSync, writeFileSync } from 'node:fs';
    while (!existsSync(${JSON.stringify(observed)})) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
    writeFileSync(${JSON.stringify(marker)}, ${JSON.stringify(content)});
  `]);
  const exited = new Promise((resolve) => writer.on('exit', resolve));
  t.after(() => writer.kill());
  const read = fs.readFileSync;
  let sawIncompleteMarker = false;
  t.mock.method(fs, 'readFileSync', (path, ...args) => {
    const value = read(path, ...args);
    if (path === marker && value.length === 0) {
      sawIncompleteMarker = true;
      writeFileSync(observed, '');
    }
    return value;
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  assert.doesNotThrow(() => buildSnapshot(options));
  assert.equal(sawIncompleteMarker, true);
  assert.equal(await exited, 0);
  assert.equal(readFileSync(marker, 'utf8'), content);
});

test('invalid or abandoned ownership markers are refused without deleting cache data', (t) => {
  const options = fixture(t);
  mkdirSync(options.cacheDir);
  const marker = join(options.cacheDir, '.context-ontology-cache');
  const unrelated = join(options.cacheDir, '.building-foreign-data');
  writeFileSync(unrelated, 'keep');
  for (const content of ['', 'interview-context-', 'invalid owner']) {
    writeFileSync(marker, content);
    assert.throws(() => buildSnapshot(options), { code: 'invalid_cache_path' });
    assert.equal(readFileSync(marker, 'utf8'), content);
    assert.equal(readFileSync(unrelated, 'utf8'), 'keep');
  }
  rmSync(marker);
  symlinkSync(unrelated, marker);
  assert.throws(() => buildSnapshot(options), { code: 'invalid_cache_path' });
  assert.equal(readlinkSync(marker), unrelated);
});

test('a symlinked snapshots directory is refused without deleting its target', (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const victim = join(options.root, 'victim');
  mkdirSync(victim);
  writeFileSync(join(victim, 'keep.txt'), 'keep');
  rmSync(join(options.cacheDir, 'snapshots'), { recursive: true });
  symlinkSync(victim, join(options.cacheDir, 'snapshots'));
  assert.throws(() => loadSnapshot(options), { code: 'snapshot_integrity_error' });
  assert.throws(() => buildSnapshot(options), { code: 'snapshot_integrity_error' });
  assert.equal(readFileSync(join(victim, 'keep.txt'), 'utf8'), 'keep');
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

test('a build waits for the cache lock held by a live process', async (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const lock = join(options.cacheDir, '.lock');
  symlinkSync(`${process.pid}-00000000-0000-4000-8000-000000000000`, lock);
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const child = execFile(process.execPath, [cli, 'build', '--repo', options.repo, '--cache', options.cacheDir]);
  let exited = false;
  const exit = new Promise((resolve) => child.on('exit', (code) => { exited = true; resolve(code); }));
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(exited, false);
  rmSync(lock);
  assert.equal(await exit, 0);
  assert.equal(existsSync(lock), false);
});

test('concurrent builds retry when the previous cache lock disappears', async (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const build = (scope) => new Promise((resolve, reject) => {
    execFile(process.execPath, [cli, 'build', '--repo', options.repo, '--cache', options.cacheDir, '--scope', scope],
      (error, stdout, stderr) => error ? reject(new Error(stderr)) : resolve(JSON.parse(stdout)));
  });
  await Promise.all(Array.from({ length: 40 }, (_, index) => build(index % 2 ? 'tech' : 'tech/A.md')));
  assert.equal(existsSync(join(options.cacheDir, '.lock')), false);
  assert.doesNotThrow(() => loadSnapshot(options));
});

test('a lock owner that exits during its liveness check is retried', (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const lock = join(options.cacheDir, '.lock');
  symlinkSync(`${process.pid}-00000000-0000-4000-8000-000000000000`, lock);
  const kill = process.kill;
  process.kill = () => {
    rmSync(lock);
    throw Object.assign(new Error('gone'), { code: 'ESRCH' });
  };
  try {
    assert.doesNotThrow(() => buildSnapshot(options));
  } finally {
    process.kill = kill;
  }
});

test('a build rechecks the source revision after waiting for the cache lock', async (t) => {
  const options = fixture(t);
  const before = buildSnapshot(options);
  const lock = join(options.cacheDir, '.lock');
  symlinkSync(`${process.pid}-00000000-0000-4000-8000-000000000000`, lock);
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const child = execFile(process.execPath, [cli, 'build', '--repo', options.repo, '--cache', options.cacheDir]);
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exit = new Promise((resolve) => child.on('exit', resolve));
  t.after(() => { rmSync(lock, { force: true }); child.kill(); });
  let waiting = false;
  for (let attempt = 0; attempt < 200 && !waiting; attempt += 1) {
    waiting = readdirSync(options.cacheDir).some((entry) => entry.startsWith('.building-'));
    if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(waiting, true);
  options.write('tech/C.md', '# New revision\n');
  options.commit();
  rmSync(lock);
  assert.equal(await exit, 1);
  assert.match(stderr, /source_changed_during_build/);
  assert.equal(loadSnapshot(options).manifest.revision, before.manifest.revision);
});

test('a cache lock left by a dead process requires explicit recovery', (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const lock = join(options.cacheDir, '.lock');
  symlinkSync(`${spawnSync('true').pid}-00000000-0000-4000-8000-000000000000`, lock);
  assert.throws(() => buildSnapshot(options), { code: 'cache_lock_stale' });
  assert.match(readlinkSync(lock), /-00000000-0000-4000-8000-000000000000$/);
});

test('a malformed cache lock is rejected without replacing it', (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const lock = join(options.cacheDir, '.lock');
  symlinkSync('garbage', lock);
  assert.throws(() => buildSnapshot(options), { code: 'snapshot_integrity_error' });
  assert.equal(readlinkSync(lock), 'garbage');
  rmSync(lock);
  symlinkSync('2147483648-00000000-0000-4000-8000-000000000000', lock);
  assert.throws(() => buildSnapshot(options), { code: 'snapshot_integrity_error' });
});

test('a directory-shaped cache lock is rejected without deleting it', (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const lock = join(options.cacheDir, '.lock');
  mkdirSync(lock);
  assert.throws(() => buildSnapshot(options), { code: 'snapshot_integrity_error' });
  assert.equal(existsSync(lock), true);
});

test('a build repairs a partially deleted snapshot at its own fingerprint', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  rmSync(join(options.cacheDir, 'snapshots', fingerprint, 'entities.jsonl'));
  const result = buildSnapshot(options);
  assert.equal(result.reused, false);
  assert.equal(loadSnapshot(options).fingerprint, fingerprint);
});

test('a build refuses a symlink at its own fingerprint with a coded error and never follows it', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  const directory = join(options.cacheDir, 'snapshots', fingerprint);
  const victim = join(options.root, 'victim');
  mkdirSync(victim);
  writeFileSync(join(victim, 'keep.txt'), 'keep');
  rmSync(directory, { recursive: true });
  symlinkSync(victim, directory);
  assert.throws(() => buildSnapshot(options), { code: 'snapshot_integrity_error' });
  assert.equal(readFileSync(join(victim, 'keep.txt'), 'utf8'), 'keep');
  assert.equal(existsSync(join(options.cacheDir, '.lock')), false);
});

test('stale build and reclaimed-lock temporaries are removed, live ones kept', (t) => {
  const options = fixture(t);
  buildSnapshot(options);
  const stale = join(options.cacheDir, '.building-stale');
  const live = join(options.cacheDir, '.building-live');
  const reclaimed = join(options.cacheDir, '.lock.dead-stale');
  mkdirSync(stale);
  mkdirSync(live);
  symlinkSync('garbage', reclaimed);
  const old = new Date(Date.now() - 11 * 60 * 1000);
  utimesSync(stale, old, old);
  lutimesSync(reclaimed, old, old);
  const result = buildSnapshot(options);
  assert.equal(result.pruned_temporaries, 2);
  assert.equal(existsSync(stale), false);
  assert.equal(existsSync(reclaimed), false);
  assert.equal(existsSync(live), true);
});

test('an artifact removed under a loading snapshot is reported as not found', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  rmSync(join(options.cacheDir, 'snapshots', fingerprint, 'entities.jsonl'));
  assert.throws(() => loadSnapshot(options), { code: 'snapshot_not_found' });
});

test('a snapshot pruned between stat and read is rebuilt during the same request', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  const artifact = join(realpathSync(options.cacheDir), 'snapshots', fingerprint, 'source-manifest.json');
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const read = fs.readFileSync;
  let pruned = false;
  t.mock.method(fs, 'readFileSync', (path, ...args) => {
    if (path === artifact && !pruned) {
      const result = JSON.parse(execFileSync(process.execPath, [cli, 'build', '--repo', options.repo,
        '--cache', options.cacheDir, '--scope', 'tech/A.md'], { encoding: 'utf8' }));
      assert.notEqual(result.fingerprint, fingerprint);
      assert.equal(result.pruned_snapshots, 1);
      pruned = true;
    }
    return read(path, ...args);
  });
  syncBuiltinESMExports();
  t.after(() => { t.mock.restoreAll(); syncBuiltinESMExports(); });
  const result = ensureFreshSnapshot(options);
  assert.equal(pruned, true);
  assert.equal(result.refreshed, true);
  assert.equal(result.snapshot.fingerprint, fingerprint);
  assert.equal(result.snapshot.entities.filter((entity) => entity.type === 'Document').length, 2);
});

test('a dangling symlink in place of the snapshot directory is refused, not rebuilt', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  const directory = join(options.cacheDir, 'snapshots', fingerprint);
  rmSync(directory, { recursive: true });
  symlinkSync(join(options.root, 'nowhere'), directory);
  assert.throws(() => loadSnapshot(options), { code: 'snapshot_integrity_error' });
});

test('a missing active snapshot directory is rebuilt on the next request', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  rmSync(join(options.cacheDir, 'snapshots', fingerprint), { recursive: true });
  assert.throws(() => loadSnapshot(options), { code: 'snapshot_not_found' });
  const result = ensureFreshSnapshot(options);
  assert.equal(result.refreshed, true);
  assert.equal(result.summary.fingerprint, result.snapshot.fingerprint);
  assert.equal(result.snapshot.fingerprint, fingerprint);
  rmSync(join(options.cacheDir, 'snapshots'), { recursive: true });
  assert.equal(ensureFreshSnapshot(options).snapshot.fingerprint, fingerprint);
});

test('a dirty worktree names a missing active snapshot instead of a missing clean one', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  rmSync(join(options.cacheDir, 'snapshots', fingerprint), { recursive: true });
  options.write('tech/C.md', '# Uncommitted\n');
  assert.throws(() => ensureFreshSnapshot(options), { code: 'unindexed_worktree', message: /active snapshot is missing/ });
});

test('a dirty worktree names the incompatible active snapshot instead of a missing one', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  const directory = join(options.cacheDir, 'snapshots', fingerprint);
  const manifest = JSON.parse(readFileSync(join(directory, 'source-manifest.json')));
  const stale = `${JSON.stringify({ ...manifest, extractor_version: '0' })}\n`;
  writeFileSync(join(directory, 'source-manifest.json'), stale);
  writeFileSync(join(options.cacheDir, 'active.json'), JSON.stringify({ fingerprint, manifest_hash: sha256(stale) }));
  options.write('tech/C.md', '# Uncommitted\n');
  assert.throws(() => ensureFreshSnapshot(options), { code: 'unindexed_worktree', message: /another schema or extractor version/ });
});

test('activating a new snapshot removes inactive snapshot directories', (t) => {
  const options = fixture(t);
  const before = buildSnapshot(options);
  mkdirSync(join(options.cacheDir, 'snapshots', 'not-a-fingerprint'));
  options.write('tech/C.md', '# New revision\n');
  options.commit();
  const after = buildSnapshot(options);
  assert.notEqual(before.fingerprint, after.fingerprint);
  assert.deepEqual(readdirSync(join(options.cacheDir, 'snapshots')).sort(), [after.fingerprint, 'not-a-fingerprint'].sort());
  assert.equal(after.pruned_snapshots, 1);
  assert.equal(buildSnapshot(options).reused, true);
});

test('an active snapshot from another extractor version is rebuilt instead of refused', (t) => {
  const options = fixture(t);
  const { fingerprint } = buildSnapshot(options);
  const manifest = JSON.parse(readFileSync(join(options.cacheDir, 'snapshots', fingerprint, 'source-manifest.json')));
  const staleFingerprint = 'f'.repeat(64);
  const stale = `${JSON.stringify({ ...manifest, fingerprint: staleFingerprint, extractor_version: '0' })}\n`;
  const directory = join(options.cacheDir, 'snapshots', staleFingerprint);
  renameSync(join(options.cacheDir, 'snapshots', fingerprint), directory);
  writeFileSync(join(directory, 'source-manifest.json'), stale);
  writeFileSync(join(options.cacheDir, 'active.json'), JSON.stringify({ fingerprint: staleFingerprint, manifest_hash: sha256(stale) }));
  assert.throws(() => loadSnapshot(options), { code: 'snapshot_incompatible' });
  const result = ensureFreshSnapshot(options);
  assert.equal(result.refreshed, true);
  assert.equal(result.snapshot.fingerprint, fingerprint);
  assert.deepEqual(readdirSync(join(options.cacheDir, 'snapshots')), [fingerprint]);
});
