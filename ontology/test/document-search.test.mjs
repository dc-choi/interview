import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { ContextError } from '../src/core.mjs';
import { outlineEvidence } from '../src/outline.mjs';
import { search } from '../src/query.mjs';
import { readEvidence } from '../src/read-evidence.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'context-document-search-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  const write = (sourcePath, content) => {
    mkdirSync(dirname(join(repo, sourcePath)), { recursive: true });
    writeFileSync(join(repo, sourcePath), content);
  };
  git(root, ['init', '-q', repo]);
  git(repo, ['config', 'user.name', 'Fixture']);
  git(repo, ['config', 'user.email', 'fixture@example.invalid']);
  for (let index = 0; index < 25; index += 1) {
    const number = String(index).padStart(2, '0');
    write(`tech/Search-${number}.md`, [
      '---',
      `aliases: [Search document ${number}]`,
      'tags: [document-search]',
      '---',
      `# Search document ${number}`,
      '',
      '## Retrieval evidence',
      '',
      `Document search pagination keeps result ${number} reachable through a pinned evidence receipt.`,
      '',
    ].join('\n'));
  }
  write('tech/Unmatched.md', '# Supplemental document\n\nThis note has a document match but not the full phrase.\n');
  write('fit/Private.md', '# Private search document\n\nDocument search pagination is outside the indexed scope.\n');
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'fixture']);
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { repo, cacheDir, write };
}

function options(item, allowlist = ['tech']) {
  return { repo: item.repo, cacheDir: item.cacheDir, allowlist };
}

function assertCode(action, code) {
  assert.throws(action, (error) => error instanceof ContextError && error.code === code);
}

function assertCandidateShape(candidate) {
  assert.equal(candidate.document.type, 'Document');
  assert.equal(typeof candidate.source_uri, 'string');
  assert.ok(candidate.source_uri.startsWith('tech/'));
  assert.ok(Array.isArray(candidate.matched_terms));
  assert.equal(Object.hasOwn(candidate, 'excerpt'), false);
  assert.equal(Object.hasOwn(candidate.document, 'excerpt'), false);
  if (candidate.best_evidence_ref) {
    const reference = candidate.best_evidence_ref;
    assert.ok(reference.id);
    assert.ok(reference.type);
    assert.ok(reference.label);
    assert.equal(reference.source_uri, candidate.source_uri);
    assert.match(reference.source_revision, /^[a-f0-9]{40}$/);
    assert.match(reference.content_hash, /^sha256:[a-f0-9]{64}$/);
    assert.ok(reference.anchor);
  }
}

test('document search returns every deterministic candidate across cursor pages without body excerpts', (t) => {
  const item = fixture(t);
  const request = { query: 'document search pagination', scope: ['tech'], max_bytes: 65536 };
  const seen = [];
  let cursor;
  let pages = 0;
  do {
    const result = search(options(item), { ...request, ...(cursor ? { cursor } : {}) });
    pages += 1;
    assert.equal(result.query, request.query);
    assert.ok(Array.isArray(result.matching.query_terms));
    assert.ok(result.matching.query_terms.length > 0);
    assert.ok(result.candidates.length <= 20);
    assert.equal(result.pagination.offset_documents, seen.length);
    assert.equal(result.pagination.returned_documents, result.candidates.length);
    assert.equal(result.pagination.total_candidates, 26);
    assert.equal(result.budget.used_bytes, Buffer.byteLength(JSON.stringify(result), 'utf8'));
    assert.ok(result.budget.used_bytes <= result.budget.effective_max_bytes);
    for (const candidate of result.candidates) assertCandidateShape(candidate);
    seen.push(...result.candidates.map((candidate) => candidate.document.id));
    if (result.pagination.complete) {
      assert.equal(result.pagination.next_cursor, null);
      cursor = null;
    } else {
      assert.equal(typeof result.pagination.next_cursor, 'string');
      assert.ok(result.pagination.next_cursor.length <= 2048);
      cursor = result.pagination.next_cursor;
    }
  } while (cursor);
  assert.equal(pages, 2);
  assert.equal(new Set(seen).size, 26);
  assert.deepEqual(seen, [...seen].sort());
});

test('document search uses a later larger budget to continue a partial small-budget page', (t) => {
  const item = fixture(t);
  const request = { query: 'document search pagination', scope: ['tech'] };
  const first = search(options(item), { ...request, max_bytes: 8000 });
  assert.ok(first.candidates.length > 0);
  assert.ok(first.candidates.length < first.pagination.total_candidates);
  assert.equal(first.pagination.complete, false);
  assert.equal(first.result_status, 'partial');
  assert.equal(first.budget.exhausted, true);

  const second = search(options(item), { ...request, max_bytes: 65536, cursor: first.pagination.next_cursor });
  assert.equal(second.pagination.offset_documents, first.candidates.length);
  assert.equal(second.pagination.complete, true);
  assert.equal(second.result_status, 'ok');
  const ids = [...first.candidates, ...second.candidates].map((candidate) => candidate.document.id);
  assert.equal(new Set(ids).size, 26);
});

test('document search best evidence references are readable and remain pinned when the worktree is dirty', (t) => {
  const item = fixture(t);
  const result = search(options(item), { query: 'document search pagination', scope: ['tech'] });
  const candidate = result.candidates.find((entry) => entry.best_evidence_ref);
  assert.ok(candidate, 'a lexical document match has an evidence reference');
  const reference = candidate.best_evidence_ref;
  const snapshot = loadSnapshot({ repo: item.repo, cacheDir: item.cacheDir });
  const evidence = readEvidence(options(item), {
    evidence_unit_id: reference.id,
    source_revision: reference.source_revision,
    content_hash: reference.content_hash,
    max_bytes: 65536,
  }, snapshot);
  assert.equal(evidence.evidence_unit.source_uri, candidate.source_uri);
  assert.match(evidence.evidence_unit.excerpt, /Document search pagination/);
  const navigation = outlineEvidence(options(item), {
    document_id: candidate.document.id,
    source_revision: snapshot.manifest.revision,
    max_bytes: 65536,
  }, snapshot);
  assert.ok(navigation.sections.some((section) => section.id === reference.id));

  item.write(candidate.source_uri, '# Dirty replacement\n\nThis must not replace pinned source text.\n');
  const dirty = search(options(item), { query: 'document search pagination', scope: ['tech'] }, snapshot);
  assert.equal(dirty.index_sync[0].status, 'unindexed_worktree');
  const pinned = readEvidence(options(item), {
    evidence_unit_id: reference.id,
    source_revision: reference.source_revision,
    content_hash: reference.content_hash,
    max_bytes: 65536,
  }, snapshot);
  assert.match(pinned.evidence_unit.excerpt, /Document search pagination/);
  assert.doesNotMatch(pinned.evidence_unit.excerpt, /Dirty replacement/);
});

test('document search reports empty, unindexed, and disallowed scopes as insufficient evidence', (t) => {
  const item = fixture(t);
  const noMatch = search(options(item), { query: 'unfindablephrase', scope: ['tech'] });
  assert.equal(noMatch.result_status, 'insufficient_evidence');
  assert.deepEqual(noMatch.candidates, []);
  assert.equal(noMatch.pagination.complete, true);
  assert.equal(noMatch.pagination.next_cursor, null);

  const unindexed = search(options(item, ['tech', 'fit']), { query: 'document search pagination', scope: ['fit'] });
  assert.equal(unindexed.result_status, 'insufficient_evidence');
  assert.equal(unindexed.index_sync[0].requested_scope_indexed, false);
  assert.ok(unindexed.coverage_gaps.some((gap) => gap.reason === 'requested_scope_not_indexed'));

  const disallowed = search(options(item), { query: 'document search pagination', scope: ['fit'] });
  assert.equal(disallowed.result_status, 'insufficient_evidence');
  assert.deepEqual(disallowed.candidates, []);
  assert.equal(disallowed.index_sync[0].requested_scope_indexed, false);
});

test('document search validates its bounded cursor and rejects cursors bound to another identity or snapshot', (t) => {
  const item = fixture(t);
  const request = { query: 'document search pagination', scope: ['tech'], max_bytes: 8000 };
  const first = search(options(item), request);
  assert.equal(first.pagination.complete, false);
  assertCode(() => search(options(item), { ...request, cursor: 'not+a+base64url+cursor' }), 'invalid_cursor');
  assertCode(() => search(options(item), { ...request, cursor: 'a'.repeat(2049) }), 'invalid_cursor');
  assertCode(() => search(options(item), { ...request, query: 'different query', cursor: first.pagination.next_cursor }), 'cursor_mismatch');
  assertCode(() => search(options(item), { ...request, scope: ['tech/Search-00.md'], cursor: first.pagination.next_cursor }), 'cursor_mismatch');
  assertCode(() => search(options(item), { ...request, depth: 1 }), 'invalid_arguments');

  item.write('tech/Revision.md', '# Revision\n\nDocument search pagination changed the active snapshot.\n');
  git(item.repo, ['add', '.']);
  git(item.repo, ['commit', '-qm', 'new snapshot']);
  buildSnapshot({ repo: item.repo, cacheDir: item.cacheDir, scopes: ['tech'] });
  assertCode(() => search(options(item), { ...request, cursor: first.pagination.next_cursor }), 'cursor_mismatch');
});
