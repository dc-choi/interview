import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { DEFAULT_SCOPES, inScope, sha256 } from '../src/core.mjs';
import { lookup, search } from '../src/query.mjs';
import { loadSnapshot } from '../src/snapshot.mjs';
import { prepareCases } from './score.mjs';

// Document discovery only: headings, source text and answer quality are unscored.
const { values } = parseArgs({ options: {
  cache: { type: 'string' },
  cases: { type: 'string', multiple: true },
} });
const options = {
  repo: fileURLToPath(new URL('../..', import.meta.url)),
  cacheDir: values.cache,
  allowlist: DEFAULT_SCOPES,
};
const snapshot = loadSnapshot(options);
const entities = new Map(snapshot.entities.map((entity) => [entity.id, entity]));
const sourcePath = (entity) => entity.source_uri ?? entity.source_path;
const summary = (rows, strategy) => ({
  positive_cases: rows.filter((row) => !row.negative).length,
  expected_document_coverage: rows.filter((row) => row[strategy].expected_document_coverage === true).length,
  negative_cases: rows.filter((row) => row.negative).length,
  empty_negative_results: rows.filter((row) => row[strategy].empty_negative_result === true).length,
  calls: rows.reduce((total, row) => total + row[strategy].calls, 0),
  bytes: rows.reduce((total, row) => total + row[strategy].bytes, 0),
});

function measure(sample, paths, empty, calls, bytes) {
  const groups = sample.expected_evidence_groups ?? [{ id: 'legacy', any_of: sample.expected_evidence }];
  return {
    expected_document_coverage: sample.expected_empty ? null
      : groups.every((group) => group.any_of.some((target) => paths.includes(target.path))),
    empty_negative_result: sample.expected_empty ? empty : null,
    forbidden_paths: (sample.forbidden_paths ?? []).filter((target) => paths.includes(target)),
    paths, calls, bytes,
  };
}

function verifyEnvelope(payload, sample) {
  const bytes = Buffer.byteLength(JSON.stringify(payload));
  assert.equal(bytes, payload.budget.used_bytes);
  assert.ok(bytes <= Math.min(sample.max_bytes, 65536));
  assert.ok(payload.index_sync.length > 0);
  for (const index of payload.index_sync) {
    assert.equal(index.revision, snapshot.manifest.revision);
    assert.equal(index.fingerprint, snapshot.fingerprint);
    assert.ok(index.artifacts_verified && index.completed && index.requested_scope_indexed);
  }
  return bytes;
}

function observe(sample) {
  const started = performance.now();
  const args = { query: sample.query, scope: sample.scope, max_bytes: sample.max_bytes };
  const pack = lookup(options, args, snapshot);
  const lookupBytes = verifyEnvelope(pack, sample);
  const lookupPaths = pack.entities.filter((entity) => entity.type === 'Document').map((entity) => {
    assert.equal(entities.get(entity.id)?.type, 'Document');
    return sourcePath(entities.get(entity.id));
  });
  const lookupEmpty = !pack.entities.length && !pack.evidence_units.length && !pack.relations.length;
  const paths = [];
  const pageResults = [];
  let cursor;
  let bytes = 0;
  // Fixed policy before opening new cases: never stop based on gold targets.
  for (let page = 0; page < 2; page += 1) {
    const result = search(options, { ...args, ...(cursor ? { cursor } : {}) }, snapshot);
    const pageBytes = verifyEnvelope(result, sample);
    assert.equal(result.pagination.offset_documents, paths.length);
    assert.equal(result.pagination.returned_documents, result.candidates.length);
    assert.ok(result.candidates.length <= 20);
    for (const candidate of result.candidates) {
      const document = entities.get(candidate.document.id);
      assert.equal(document?.type, 'Document');
      assert.equal(candidate.source_uri, sourcePath(document));
      assert.ok(inScope(candidate.source_uri, sample.scope));
      assert.ok(!paths.includes(candidate.source_uri));
      assert.equal(Object.hasOwn(candidate, 'excerpt'), false);
      const reference = candidate.best_evidence_ref;
      if (reference) {
        const unit = entities.get(reference.id);
        assert.ok(unit && ['Section', 'RelationAssertion'].includes(unit.type));
        assert.equal(sourcePath(unit), candidate.source_uri);
        for (const key of ['type', 'source_revision', 'content_hash', 'anchor']) {
          assert.deepEqual(reference[key], unit[key]);
        }
      }
      paths.push(candidate.source_uri);
    }
    bytes += pageBytes;
    pageResults.push({
      ...measure(sample, [...paths], paths.length === 0, page + 1, bytes),
      page_bytes: pageBytes,
      complete: result.pagination.complete,
      total_candidates: result.pagination.total_candidates,
      result_status: result.result_status,
    });
    if (result.pagination.complete) {
      assert.equal(result.pagination.next_cursor, null);
      assert.equal(paths.length, result.pagination.total_candidates);
      break;
    }
    assert.ok(result.candidates.length > 0 && result.pagination.next_cursor !== cursor);
    cursor = result.pagination.next_cursor;
  }
  const union = [...new Set([...lookupPaths, ...paths])];
  return {
    id: sample.id, negative: sample.expected_empty === true,
    lookup: measure(sample, lookupPaths, lookupEmpty, 1, lookupBytes),
    search_first_page: pageResults[0],
    search_two_pages: pageResults.at(-1),
    lookup_plus_search: measure(sample, union, lookupEmpty && !paths.length,
      1 + pageResults.length, lookupBytes + bytes),
    elapsed_ms: Math.round(performance.now() - started),
    index_status: pack.index_sync.map((index) => index.status),
  };
}

const suites = [];
for (const filename of values.cases ?? [fileURLToPath(new URL('./document-search-cases-2026-09-08.json', import.meta.url))]) {
  const caseBytes = readFileSync(filename);
  const samples = prepareCases(JSON.parse(caseBytes), snapshot, options.repo);
  const rows = samples.map(observe);
  suites.push({
    cases_file: filename.split('/').at(-1), cases_hash: sha256(caseBytes),
    summary: Object.fromEntries(['lookup', 'search_first_page', 'search_two_pages', 'lookup_plus_search']
      .map((strategy) => [strategy, summary(rows, strategy)])),
    rows,
  });
}
console.log(JSON.stringify({
  observed_at: new Date().toISOString(),
  policy: 'At most two search pages at each case budget, without gold-based early stopping. Document metadata coverage only; no heading, body or answer-quality score.',
  source_revision: snapshot.manifest.revision,
  fingerprint: snapshot.fingerprint,
  counts: snapshot.manifest.counts,
  code_hashes: Object.fromEntries(['src/query.mjs', 'evaluation/document-search.mjs', 'evaluation/score.mjs']
    .map((filename) => [filename, sha256(readFileSync(new URL(`../${filename}`, import.meta.url)))])),
  suites,
}, null, 2));
