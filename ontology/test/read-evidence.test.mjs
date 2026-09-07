import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ContextError } from '../src/core.mjs';
import { readBlob } from '../src/repository.mjs';
import { READ_LIMITS, readEvidence } from '../src/read-evidence.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'context-read-evidence-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  mkdirSync(join(repo, 'tech'), { recursive: true });
  git(root, ['init', '-q', repo]);
  git(repo, ['config', 'user.name', 'Fixture']);
  git(repo, ['config', 'user.email', 'fixture@example.invalid']);
  const clause = `${'prefix '.repeat(240)}필수 조항은 한국어와 emoji 🧪, 따옴표 "와 backslash \\를 보존한다. ${'suffix '.repeat(1200)}`;
  writeFileSync(join(repo, 'tech', 'evidence.md'), `# Source\n\n## Evidence\n\n${clause}\n`);
  writeFileSync(join(repo, 'tech', 'other.md'), '# Other\n\n## Hidden\n\nNot in the requested allowlist.\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'fixture']);
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const snapshot = loadSnapshot({ repo, cacheDir });
  const unit = snapshot.entities.find((entity) => entity.type === 'Section'
    && entity.source_uri === 'tech/evidence.md' && entity.label === 'Evidence');
  assert.ok(unit);
  return { root, repo, cacheDir, snapshot, unit };
}

function request(snapshot, unit, extra = {}) {
  return {
    evidence_unit_id: unit.id,
    source_revision: snapshot.manifest.revision,
    content_hash: unit.content_hash,
    ...extra,
  };
}

function assertCode(action, code) {
  assert.throws(action, (error) => error instanceof ContextError && error.code === code);
}

test('readEvidence pages pinned UTF-8 evidence within an exact JSON byte budget', (t) => {
  const { repo, cacheDir, snapshot, unit } = fixture(t);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const rawBytes = readBlob(repo, snapshot.manifest.revision, unit.source_uri)
    .subarray(unit.anchor.start_byte, unit.anchor.end_byte);
  const raw = rawBytes.toString('utf8');
  let offset = 0;
  let reconstructed = '';
  let pages = 0;
  do {
    const response = readEvidence(options, request(snapshot, unit, { offset_bytes: offset, max_bytes: 5000 }), snapshot);
    pages += 1;
    reconstructed += response.evidence_unit.excerpt;
    assert.equal(Buffer.byteLength(JSON.stringify(response), 'utf8'), response.budget.used_bytes);
    assert.ok(response.budget.used_bytes <= response.budget.effective_max_bytes);
    assert.equal(response.pagination.offset_bytes, offset);
    assert.equal(response.evidence_unit.content_hash, unit.content_hash);
    assert.equal(response.index_sync[0].status, 'synced');
    assert.equal(response.evidence_unit.truncated, !(offset === 0 && response.pagination.complete));
    if (response.pagination.complete) offset = null;
    else {
      assert.ok(response.pagination.next_offset_bytes > offset);
      offset = response.pagination.next_offset_bytes;
    }
  } while (offset !== null);
  assert.ok(pages > 1);
  assert.equal(reconstructed, raw);
  assert.ok(reconstructed.includes('필수 조항은 한국어와 emoji 🧪'));
  let laterOffset = Math.floor(rawBytes.length / 2);
  while ((rawBytes[laterOffset] & 0xc0) === 0x80) laterOffset -= 1;
  const full = readEvidence(options, request(snapshot, unit, { offset_bytes: laterOffset, max_bytes: 65536 }), snapshot);
  const exact = readEvidence(options, request(snapshot, unit, {
    offset_bytes: laterOffset,
    max_bytes: full.budget.used_bytes,
  }), snapshot);
  assert.ok(full.pagination.complete);
  assert.ok(exact.pagination.complete);
  assert.equal(exact.evidence_unit.excerpt, full.evidence_unit.excerpt);
  assert.equal(Buffer.byteLength(JSON.stringify(exact), 'utf8'), exact.budget.used_bytes);
  assert.ok(READ_LIMITS.serverMaxBytes >= READ_LIMITS.defaultMaxBytes);
});

test('readEvidence binds reads to snapshot revision and content hash', (t) => {
  const { repo, cacheDir, snapshot, unit } = fixture(t);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  assertCode(() => readEvidence(options, request(snapshot, unit, { content_hash: `sha256:${'0'.repeat(64)}` }), snapshot), 'evidence_mismatch');
  assertCode(() => readEvidence(options, request(snapshot, unit, { source_revision: 'a'.repeat(40) }), snapshot), 'snapshot_revision_mismatch');
  assertCode(() => readEvidence(options, request(snapshot, unit, { source_revision: 'a'.repeat(45) }), snapshot), 'invalid_source_revision');

  writeFileSync(join(repo, 'tech', 'evidence.md'), '# New\n\n## Evidence\n\nchanged worktree text\n');
  const dirty = readEvidence(options, request(snapshot, unit), snapshot);
  assert.equal(dirty.index_sync[0].status, 'unindexed_worktree');
  assert.ok(dirty.evidence_unit.excerpt.includes('필수 조항'));
  assert.ok(!dirty.evidence_unit.excerpt.includes('changed worktree text'));
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'new revision']);
  const stale = readEvidence(options, request(snapshot, unit), snapshot);
  assert.equal(stale.index_sync[0].status, 'revision_mismatch');
});

test('readEvidence rejects inaccessible units and malformed requests', (t) => {
  const { repo, cacheDir, snapshot, unit } = fixture(t);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const document = snapshot.entities.find((entity) => entity.type === 'Document');
  assert.ok(document);
  assertCode(() => readEvidence({ ...options, allowlist: ['fit'] }, request(snapshot, unit), snapshot), 'evidence_not_found');
  assertCode(() => readEvidence(options, { ...request(snapshot, unit), extra: true }, snapshot), 'invalid_arguments');
  assertCode(() => readEvidence(options, { ...request(snapshot, unit), evidence_unit_id: document.id }, snapshot), 'evidence_not_found');
  assertCode(() => readEvidence(options, { ...request(snapshot, unit), evidence_unit_id: 'x'.repeat(READ_LIMITS.maxEvidenceIdBytes + 1) }, snapshot), 'arguments_too_large');
  assertCode(() => readEvidence(options, request(snapshot, unit, { offset_bytes: -1 }), snapshot), 'invalid_offset_bytes');
  assertCode(() => readEvidence(options, request(snapshot, unit, { max_bytes: 0 }), snapshot), 'invalid_max_bytes');
  assertCode(() => readEvidence(options, request(snapshot, unit, { max_bytes: 1 }), snapshot), 'budget_too_small');
  assertCode(() => readEvidence(options, request(snapshot, unit, { offset_bytes: unit.anchor.end_byte - unit.anchor.start_byte + 1 }), snapshot), 'invalid_offset_bytes');
  const raw = readBlob(repo, snapshot.manifest.revision, unit.source_uri)
    .subarray(unit.anchor.start_byte, unit.anchor.end_byte);
  const korean = raw.indexOf(Buffer.from('한'));
  assert.ok(korean >= 0);
  assertCode(() => readEvidence(options, request(snapshot, unit, { offset_bytes: korean + 1 }), snapshot), 'invalid_offset_bytes');
  assertCode(() => readEvidence(options, request(snapshot, unit, { offset_bytes: korean, max_bytes: 1 }), snapshot), 'budget_too_small');
});

test('readEvidence detects corrupted snapshot metadata and symlink paths', (t) => {
  const { root, repo, cacheDir, snapshot, unit } = fixture(t);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const tampered = {
    ...snapshot,
    entities: snapshot.entities.map((entity) => entity.id === unit.id
      ? { ...entity, anchor: { ...entity.anchor, end_byte: Number.MAX_SAFE_INTEGER } }
      : entity),
  };
  assertCode(() => readEvidence(options, request(snapshot, unit), tampered), 'source_integrity_error');
  const assertion = {
    ...unit,
    id: 'assertion:fixture',
    type: 'RelationAssertion',
  };
  const relationSnapshot = { ...snapshot, entities: [...snapshot.entities, assertion] };
  assert.equal(readEvidence(options, request(snapshot, assertion), relationSnapshot).evidence_unit.id, assertion.id);

  rmSync(join(repo, 'tech', 'evidence.md'));
  symlinkSync(join(root, 'outside.md'), join(repo, 'tech', 'evidence.md'));
  writeFileSync(join(root, 'outside.md'), 'outside');
  assertCode(() => readEvidence(options, request(snapshot, unit), snapshot), 'symlink_path');
});

test('readEvidence rejects a symlinked parent directory', (t) => {
  const { root, repo, cacheDir, snapshot, unit } = fixture(t);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const actual = join(root, 'actual-tech');
  renameSync(join(repo, 'tech'), actual);
  symlinkSync(actual, join(repo, 'tech'));
  assertCode(() => readEvidence(options, request(snapshot, unit), snapshot), 'symlink_path');
});
