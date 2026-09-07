import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareCases, scoreResult } from '../evaluation/score.mjs';

const sample = { id: 'source-evidence', query: 'recovery', expected_evidence: [
  { path: 'tech/primary.md', heading: 'Recovery', any_text: ['Retry the entire transaction'] },
  { path: 'tech/alternative.md', heading: 'Retry', any_text: ['Repeat all writes'] },
] };
const result = (units) => ({ result_status: 'partial', evidence_units: units, entities: [], relations: [],
  index_sync: [{ requested_scope_indexed: true, artifacts_verified: true, completed: true }] });
const unit = (path, heading, excerpt) => ({ source_uri: path, anchor: { heading_path: [heading] }, excerpt });

test('evaluation requires the useful body in the same permitted source and heading', () => {
  const truncated = scoreResult(sample, result([unit('tech/primary.md', 'Recovery', '## Recovery\nBackground only')]));
  assert.equal(truncated.document_hit, true);
  assert.equal(truncated.heading_hit, true);
  assert.equal(truncated.evidence_hit, false);
  assert.equal(truncated.passed, false);

  const unrelated = scoreResult(sample, result([
    unit('tech/primary.md', 'Recovery', '## Recovery'),
    unit('tech/unrelated.md', 'Other', 'Retry the entire transaction'),
  ]));
  assert.equal(unrelated.passed, false);
  assert.equal(scoreResult(sample, result([unit('tech/alternative.md', 'Retry', '## Retry\nRepeat all writes')])).passed, true);
});

test('evaluation excludes a heading-only text match and reports forbidden evidence', () => {
  const headingOnly = { ...sample, expected_evidence: [{ path: 'tech/primary.md', heading: 'Recovery', any_text: ['Recovery'] }] };
  assert.equal(scoreResult(headingOnly, result([unit('tech/primary.md', 'Recovery', '## Recovery')])).passed, false);
  assert.equal(scoreResult(headingOnly, result([unit('tech/primary.md', 'Recovery', 'Recovery\n========\n')])).passed, false);
  const noise = scoreResult({ ...sample, forbidden_paths: ['tech/noise.md'] }, result([
    unit('tech/primary.md', 'Recovery', 'Retry the entire transaction'),
    unit('tech/noise.md', 'Other', 'noise'),
  ]));
  assert.equal(noise.evidence_hit, true);
  assert.equal(noise.passed, false);
  assert.deepEqual(noise.forbidden_hits, ['tech/noise.md']);
  const leaked = scoreResult({ ...sample, scope: ['tech'] }, result([
    unit('tech/primary.md', 'Recovery', 'Retry the entire transaction'),
    unit('biz/outside.md', 'Other', 'outside scope'),
  ]));
  assert.equal(leaked.passed, false);
  assert.deepEqual(leaked.out_of_scope_paths, ['biz/outside.md']);
});

test('no-answer evaluation rejects unrelated results and incomplete responses', () => {
  const empty = { id: 'no-source', expected_empty: true, expected_evidence: [] };
  assert.equal(scoreResult(empty, result([])).passed, false);
  assert.equal(scoreResult(empty, { ...result([]), result_status: 'insufficient_evidence' }).passed, true);
  assert.equal(scoreResult(empty, { ...result([]), result_status: 'insufficient_evidence', entities: [{ id: 'noise' }] }).passed, false);
  assert.equal(scoreResult(empty, { ...result([]), result_status: 'insufficient_evidence', index_sync: [] }).passed, false);
});

test('evaluation rejects missing gold targets and invalid case definitions', () => {
  const snapshot = { entities: [{ type: 'Section', source_uri: 'tech/primary.md', anchor: { heading_path: ['Recovery'] } }] };
  const oldCase = { id: 'legacy', query: 'recovery', expected_path: 'tech/primary.md', expected_heading: 'Recovery' };
  assert.equal(prepareCases([oldCase], snapshot)[0].expected_evidence[0].path, oldCase.expected_path);
  assert.throws(() => prepareCases([{ ...oldCase, expected_heading: 'Missing' }], snapshot), /missing from snapshot/);
  assert.throws(() => prepareCases([oldCase, oldCase], snapshot), /unique IDs/);
  assert.throws(() => prepareCases([], snapshot), /nonempty array/);
  assert.throws(() => prepareCases([{ ...oldCase, expected_empty: true }], snapshot), /Invalid expected evidence/);
  assert.throws(() => prepareCases([{ ...oldCase, scope: ['biz'] }], snapshot), /Invalid evidence target/);
});
