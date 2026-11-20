import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildSnapshot } from '../src/snapshot.mjs';
import { CONCEPT_FILES, gitFixture } from './ontology-fixture.mjs';

const runner = fileURLToPath(new URL('../evaluation/competency.mjs', import.meta.url));

test('the competency runner scores the lookup and concept arms on the same expected evidence', (t) => {
  const fixture = gitFixture(t, CONCEPT_FILES);
  buildSnapshot(fixture);
  const cases = join(fixture.root, 'cases.json');
  writeFileSync(cases, JSON.stringify([
    { id: 'dual-write', split: 'calibration', question: 'DB와 브로커에 따로 쓰면 무엇을 검토해야 할까', start: 'dual-write-problem',
      predicate: 'addressed_by', expected_evidence: [{ path: 'tech/Outbox.md', heading: '해결: Outbox 테이블' }],
      expected_terms: ['Transactional Outbox'] },
    { id: 'relay-cost', split: 'holdout', question: '릴레이 지연 비용', start: 'Transactional Outbox', predicate: 'has_tradeoff',
      expected_evidence: [{ path: 'tech/Outbox.md', heading: '비용' }, { path: 'tech/Missing.md', heading: 'None' }],
      expected_terms: ['relay lag', 'Absent'] },
    { id: 'unknown-start', split: 'holdout', question: '알 수 없는 개념', start: 'no-such-concept', predicate: '',
      expected_evidence: [{ path: 'tech/Outbox.md', heading: '문제' }], expected_terms: [] },
    { id: 'no-alternative', split: 'calibration', question: 'qzxv wplk', start: 'dual-write-problem', predicate: 'alternative_to',
      expected_evidence: [], expected_terms: [], expected_empty: true },
    // The concept query rejects a start over 1024 bytes; that error must not pass the negative case.
    { id: 'query-error', split: 'calibration', question: 'qzxv wplk', start: 'x'.repeat(1100), predicate: 'addresses',
      expected_evidence: [], expected_terms: [], expected_empty: true },
  ]));
  const report = JSON.parse(execFileSync(process.execPath, [runner, '--cache', fixture.cacheDir, '--repo', fixture.repo,
    '--cases', cases], { encoding: 'utf8' }));
  const byId = Object.fromEntries(report.cases.map((item) => [item.id, item]));
  assert.deepEqual([byId['dual-write'].concept.evidence_score, byId['dual-write'].concept.term_score], [1, 1]);
  assert.deepEqual([byId['relay-cost'].concept.evidence_score, byId['relay-cost'].concept.term_score], [0.5, 0.5]);
  assert.deepEqual(byId['relay-cost'].concept.terms_found, ['relay lag']);
  assert.deepEqual(byId['relay-cost'].unknown_expected_evidence, [{ path: 'tech/Missing.md', heading: 'None' }]);
  assert.deepEqual([byId['unknown-start'].concept.result_status, byId['unknown-start'].concept.evidence_score,
    byId['unknown-start'].concept.term_score], ['concept_not_found', 0, null]);
  assert.deepEqual([byId['no-alternative'].expected_empty, byId['no-alternative'].concept.evidence_score,
    byId['no-alternative'].lookup.evidence_score], [true, 1, 1], 'a negative case passes when the arm returns nothing');
  assert.deepEqual([byId['query-error'].concept.result_status, byId['query-error'].concept.error.code,
    byId['query-error'].concept.evidence_score, byId['query-error'].lookup.evidence_score], ['error', 'invalid_concept', 0, 1]);
  for (const item of report.cases) {
    assert.ok(item.lookup.evidence_score >= 0 && item.lookup.evidence_score <= 1);
    assert.equal(typeof item.lookup.result_status, 'string');
  }
  assert.deepEqual(report.arms.lookup.scope, 'unscoped');
  const { calibration, holdout } = report.splits;
  assert.deepEqual([calibration.cases, holdout.cases], [3, 2]);
  assert.equal(holdout.concept_evidence_score, 0.25);
  assert.equal(holdout.concepts_resolved, 1);
  assert.equal(holdout.cases_with_unknown_expected_evidence, 1);
  // Negative cases are scored apart, so passing them by not resolving cannot lift the positive means.
  assert.deepEqual([calibration.positive_cases, calibration.negative_cases, holdout.positive_cases, holdout.negative_cases],
    [1, 2, 2, 0]);
  assert.deepEqual(calibration.lookup, { positive_evidence_score: 0, negative_evidence_score: 1 });
  assert.deepEqual(calibration.concept, { positive_evidence_score: 1, negative_evidence_score: 0.5, positive_starts_resolved: 1,
    resolved_positive_evidence_score: 1, negative_starts_resolved: 1, errors: 1 });
  assert.deepEqual(holdout.concept, { positive_evidence_score: 0.25, negative_evidence_score: null, positive_starts_resolved: 1,
    resolved_positive_evidence_score: 0.5, negative_starts_resolved: 0, errors: 0 });
  for (const field of ['query_code_hash', 'concept_code_hash', 'schema_code_hash', 'evaluator_hash', 'cases_hash', 'fingerprint']) {
    assert.match(report[field], /^[a-f0-9]{64}$/, field);
  }

  assert.deepEqual(byId['dual-write'].follow, { retried: false, ...byId['dual-write'].concept });
  assert.deepEqual(byId['query-error'].follow, { retried: false, ...byId['query-error'].concept });

  for (const [caseId, change] of [['no-split', { split: undefined }], ['bad-predicate', { predicate: 'fixes' }],
    ['missing-predicate', { predicate: undefined }]]) {
    writeFileSync(cases, JSON.stringify([{ id: caseId, split: 'holdout', question: 'q', start: 's', predicate: 'addresses',
      expected_evidence: [{ path: 'tech/Outbox.md', heading: '문제' }], expected_terms: [], ...change }]));
    const invalid = spawnSync(process.execPath, [runner, '--cache', fixture.cacheDir, '--repo', fixture.repo, '--cases', cases]);
    assert.notEqual(invalid.status, 0, caseId);
    assert.match(invalid.stderr.toString(), new RegExp(`Invalid competency case: ${caseId}`));
  }
});

test('the follow arm retries a not-found start once with its first candidate and counts the retries', (t) => {
  const fixture = gitFixture(t, CONCEPT_FILES);
  buildSnapshot(fixture);
  const cases = join(fixture.root, 'cases.json');
  const solved = [{ path: 'tech/Outbox.md', heading: '해결: Outbox 테이블' }];
  writeFileSync(cases, JSON.stringify([
    { id: 'reworded', split: 'holdout', question: 'q', start: '쓰기 이중 문제', predicate: 'addressed_by',
      expected_evidence: solved, expected_terms: ['Transactional Outbox'] },
    { id: 'exact', split: 'holdout', question: 'q', start: 'dual-write-problem', predicate: 'addressed_by',
      expected_evidence: solved, expected_terms: [] },
    { id: 'unknown', split: 'holdout', question: 'q', start: 'qzxv wplk', predicate: '', expected_evidence: solved,
      expected_terms: [] },
    { id: 'negative', split: 'calibration', question: 'qzxv wplk', start: 'Dual Write', predicate: 'addressed_by',
      expected_evidence: [], expected_terms: [], expected_empty: true },
  ]));
  const report = JSON.parse(execFileSync(process.execPath, [runner, '--cache', fixture.cacheDir, '--repo', fixture.repo,
    '--cases', cases], { encoding: 'utf8' }));
  const byId = Object.fromEntries(report.cases.map((item) => [item.id, item]));
  const { reworded, exact, unknown, negative } = byId;
  assert.deepEqual([reworded.concept.result_status, reworded.concept.evidence_score], ['concept_not_found', 0]);
  assert.deepEqual([reworded.follow.retried, reworded.follow.start, reworded.follow.match, reworded.follow.result_status,
    reworded.follow.evidence_score, reworded.follow.term_score],
  [true, 'concept:interview-vault:dual-write-problem', 'name_tokens', 'ok', 1, 1]);
  assert.deepEqual(exact.follow, { retried: false, ...exact.concept });
  assert.deepEqual([unknown.follow.retried, unknown.follow.result_status, unknown.follow.evidence_score],
    [false, 'concept_not_found', 0]);
  // A negative case passes the concept arm by not resolving; following its candidate fails it.
  assert.deepEqual([negative.concept.evidence_score, negative.follow.retried, negative.follow.evidence_score], [1, true, 0]);
  const { calibration, holdout } = report.splits;
  assert.deepEqual(holdout.concept, { positive_evidence_score: 1 / 3, negative_evidence_score: null, positive_starts_resolved: 1,
    resolved_positive_evidence_score: 1, negative_starts_resolved: 0, errors: 0 });
  assert.deepEqual(holdout.follow, { evidence_score: 2 / 3, term_score: 1, positive_evidence_score: 2 / 3,
    negative_evidence_score: null, positive_starts_resolved: 2, resolved_positive_evidence_score: 1,
    negative_starts_resolved: 0, errors: 0, positive_retried: 1, negative_retried: 0 });
  assert.deepEqual(calibration.follow, { evidence_score: 0, term_score: null, positive_evidence_score: null,
    negative_evidence_score: 0, positive_starts_resolved: 0, resolved_positive_evidence_score: null,
    negative_starts_resolved: 1, errors: 0, positive_retried: 0, negative_retried: 1 });
  assert.match(report.arms.follow.input, /first candidate/);
});
