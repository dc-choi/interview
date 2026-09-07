import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ContextError, sha256 } from '../src/core.mjs';
import { outlineEvidence } from '../src/outline.mjs';
import { readBlob } from '../src/repository.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'context-outline-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  mkdirSync(join(repo, 'tech'), { recursive: true });
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  writeFileSync(join(repo, 'tech', 'guide.md'), '# 시작 🙂\n\n## 중복\n\n하나\n\n## 중복\n\n둘\n\n## 끝\n\n셋\n');
  git('add', '.'); git('commit', '-qm', 'fixture');
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const snapshot = loadSnapshot({ repo, cacheDir });
  const document = snapshot.entities.find((entity) => entity.type === 'Document');
  return { root, repo, cacheDir, snapshot, document };
}

function args(item, extra = {}) { return { document_id: item.document.id, source_revision: item.snapshot.manifest.revision, ...extra }; }
function code(action, expected) { assert.throws(action, (error) => error instanceof ContextError && error.code === expected); }

test('outline pages parser sections deterministically within exact budgets', (t) => {
  const item = fixture(t); const options = { repo: item.repo, cacheDir: item.cacheDir, allowlist: ['tech'] };
  const first = outlineEvidence(options, args(item, { max_bytes: 1600 }), item.snapshot);
  assert.equal(Buffer.byteLength(JSON.stringify(first)), first.budget.used_bytes);
  assert.ok(first.sections.length > 0); assert.equal(first.sections[0].anchor.start_byte, 0);
  const seen = [...first.sections]; let offset = first.pagination.next_offset_sections;
  while (offset !== null) {
    const page = outlineEvidence(options, args(item, { offset_sections: offset, max_bytes: 1600 }), item.snapshot);
    assert.equal(page.pagination.offset_sections, offset); assert.ok(page.pagination.next_offset_sections === null || page.pagination.next_offset_sections > offset);
    seen.push(...page.sections); offset = page.pagination.next_offset_sections;
  }
  assert.equal(new Set(seen.map((section) => section.id)).size, 5);
  const terminal = outlineEvidence(options, args(item, { offset_sections: seen.length }), item.snapshot);
  assert.equal(terminal.pagination.complete, true); assert.deepEqual(terminal.sections, []);
});

test('outline rejects stale, inaccessible, malformed and corrupted sources', (t) => {
  const item = fixture(t); const options = { repo: item.repo, cacheDir: item.cacheDir, allowlist: ['tech'] };
  code(() => outlineEvidence(options, args(item, { source_revision: 'a'.repeat(40) }), item.snapshot), 'snapshot_revision_mismatch');
  code(() => outlineEvidence({ ...options, allowlist: ['fit'] }, args(item), item.snapshot), 'document_not_found');
  code(() => outlineEvidence(options, { ...args(item), source_uri: 'bad' }, item.snapshot), 'invalid_arguments');
  code(() => outlineEvidence(options, args(item, { offset_sections: -1 }), item.snapshot), 'invalid_offset_sections');
  const bad = { ...item.snapshot, entities: item.snapshot.entities.map((entity) => entity.id === item.document.id ? { ...entity, content_hash: 'sha256:bad' } : entity) };
  code(() => outlineEvidence(options, args(item), bad), 'source_integrity_error');
  const section = item.snapshot.entities.find((entity) => entity.type === 'Section' && entity.source_uri === item.document.source_uri);
  const blob = readBlob(item.repo, item.snapshot.manifest.revision, item.document.source_uri);
  const emoji = blob.indexOf(Buffer.from('🙂'));
  const cut = { ...section, anchor: { ...section.anchor, end_byte: emoji + 1 } };
  cut.content_hash = `sha256:${sha256(blob.subarray(cut.anchor.start_byte, cut.anchor.end_byte))}`;
  const brokenBoundary = { ...item.snapshot, entities: item.snapshot.entities.map((entity) => entity.id === cut.id ? cut : entity) };
  code(() => outlineEvidence(options, args(item), brokenBoundary), 'source_integrity_error');
});

test('outline rejects file symlinks without reading replacement content', (t) => {
  const item = fixture(t); const options = { repo: item.repo, cacheDir: item.cacheDir, allowlist: ['tech'] };
  rmSync(join(item.repo, 'tech', 'guide.md')); writeFileSync(join(item.root, 'outside.md'), '# outside\n');
  symlinkSync(join(item.root, 'outside.md'), join(item.repo, 'tech', 'guide.md'));
  code(() => outlineEvidence(options, args(item), item.snapshot), 'symlink_path');
});
