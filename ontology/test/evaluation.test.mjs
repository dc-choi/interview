import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareCases, scoreResult } from '../evaluation/score.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';

const sample = { id: 'source-evidence', query: 'recovery', expected_evidence: [
  { path: 'tech/primary.md', heading: 'Recovery', any_text: ['Retry the entire transaction'] },
  { path: 'tech/alternative.md', heading: 'Retry', any_text: ['Repeat all writes'] },
] };
const result = (units) => ({ result_status: 'partial', evidence_units: units, entities: [], relations: [],
  index_sync: [{ requested_scope_indexed: true, artifacts_verified: true, completed: true }] });
const unit = (path, heading, excerpt) => ({ source_uri: path, anchor: { heading_path: [heading] }, excerpt });

function sourceFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'context-evaluation-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  const git = (...args) => execFileSync('git', ['-C', repo, ...args]);
  mkdirSync(join(repo, 'tech'), { recursive: true });
  git('init', '-q');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  writeFileSync(join(repo, 'tech', 'source.md'), '# Source\n\n## Rule\n\nFirst requirement. Second requirement.\n');
  git('add', '.');
  git('commit', '-qm', 'fixture');
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { repo, snapshot: loadSnapshot({ repo, cacheDir }) };
}

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

test('evaluation requires every evidence group while allowing alternatives within a group', () => {
  const grouped = { id: 'grouped', query: 'recovery', expected_evidence_groups: [
    { id: 'rule', any_of: [
      { path: 'tech/primary.md', heading: 'Recovery', all_text: ['Retry', 'transaction'] },
      { path: 'tech/alternative.md', heading: 'Retry', all_text: ['Repeat', 'writes'] },
    ] },
    { id: 'exception', any_of: [
      { path: 'tech/exception.md', heading: 'Exception', any_text: ['Do not retry'] },
    ] },
  ] };
  const missing = scoreResult(grouped, result([unit('tech/primary.md', 'Recovery', '## Recovery\nRetry transaction')]));
  assert.equal(missing.evidence_hit, false);
  assert.equal(missing.passed, false);
  assert.equal(missing.evidence_groups_total, 2);
  assert.equal(missing.evidence_groups_hit, 1);
  assert.deepEqual(missing.missing_evidence_groups, ['exception']);
  assert.equal(missing.evidence_recall, 0.5);

  const alternative = scoreResult(grouped, result([
    unit('tech/alternative.md', 'Retry', '## Retry\nRepeat all writes'),
    unit('tech/exception.md', 'Exception', '## Exception\nDo not retry'),
  ]));
  assert.equal(alternative.evidence_hit, true);
  assert.equal(alternative.passed, true);
  assert.deepEqual(alternative.missing_evidence_groups, []);
});

test('evaluation requires all body text in one evidence unit', () => {
  const allText = { id: 'all-text', query: 'recovery', expected_evidence_groups: [{ id: 'rule', any_of: [
    { path: 'tech/primary.md', heading: 'Recovery', any_text: ['Retry'], all_text: ['Retry', 'transaction'] },
  ] }] };
  const truncated = scoreResult(allText, result([unit('tech/primary.md', 'Recovery', '## Recovery\nRetry')]));
  assert.equal(truncated.evidence_hit, false);
  const split = scoreResult(allText, result([
    unit('tech/primary.md', 'Recovery', '## Recovery\nRetry'),
    unit('tech/primary.md', 'Recovery', '## Recovery\ntransaction'),
  ]));
  assert.equal(split.evidence_hit, false);
});

test('group body metrics ignore alternatives without body assertions', () => {
  const mixed = { id: 'mixed-body', query: 'recovery', expected_evidence_groups: [{ id: 'rule', any_of: [
    { path: 'tech/primary.md', heading: 'Recovery', all_text: ['Retry', 'transaction'] },
    { path: 'tech/alternative.md', heading: 'Retry' },
  ] }] };
  const alternate = scoreResult(mixed, result([unit('tech/alternative.md', 'Retry', '## Retry\nHeading only')]));
  assert.equal(alternate.evidence_hit, true);
  assert.equal(alternate.body_hit, false);
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

test('evaluation validates grouped schema and pinned all-text evidence', (t) => {
  const { repo, snapshot } = sourceFixture(t);
  const grouped = { id: 'grouped', query: 'source', scope: ['tech'], expected_evidence_groups: [{
    id: 'rule', any_of: [{ path: 'tech/source.md', heading: 'Rule', all_text: ['First requirement', 'Second requirement'] }],
  }] };
  assert.equal(prepareCases([grouped], snapshot, repo)[0].expected_evidence_groups[0].id, 'rule');
  assert.throws(() => prepareCases([{ ...grouped, expected_evidence: [] }], snapshot, repo), /Mixed evidence formats/);
  assert.throws(() => prepareCases([{ ...grouped, expected_evidence_groups: [{ id: '', any_of: grouped.expected_evidence_groups[0].any_of }] }], snapshot, repo), /Invalid evidence groups/);
  assert.throws(() => prepareCases([{ ...grouped, expected_evidence_groups: [{ ...grouped.expected_evidence_groups[0], id: 'rule' }, { ...grouped.expected_evidence_groups[0], id: 'rule' }] }], snapshot, repo), /Invalid evidence groups/);
  assert.throws(() => prepareCases([{ ...grouped, expected_evidence_groups: [{ ...grouped.expected_evidence_groups[0], any_of: [] }] }], snapshot, repo), /Invalid evidence groups/);
  assert.throws(() => prepareCases([{ ...grouped, expected_empty: true }], snapshot, repo), /Invalid evidence groups/);
  assert.throws(() => prepareCases([{ ...grouped, expected_evidence_groups: [{ ...grouped.expected_evidence_groups[0], any_of: [{ ...grouped.expected_evidence_groups[0].any_of[0], all_text: ['missing gold text'] }] }] }], snapshot, repo), /Gold body text missing/);
  assert.equal(prepareCases([{ id: 'empty', query: 'none', expected_empty: true, expected_evidence: [] }], snapshot, repo)[0].expected_empty, true);
});
