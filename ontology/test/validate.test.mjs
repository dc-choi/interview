import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { defaultCacheDir } from '../src/snapshot.mjs';
import { CONCEPT_FILES, cli, gitFixture } from './ontology-fixture.mjs';

function run(...args) {
  const child = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(child.stderr, '', child.stderr);
  return { code: child.status, report: JSON.parse(child.stdout) };
}

const broken = '---\nontology_relations:\n  - {predicate: mentions, target: "concept:missing"}\n---\n# A\n';

test('validate reports the HEAD ontology gaps and counts and fails only when gaps exist', (t) => {
  const clean = gitFixture(t, CONCEPT_FILES);
  const ok = run('validate', '--repo', clean.repo);
  assert.equal(ok.code, 0);
  assert.equal(ok.report.mode, 'head');
  assert.deepEqual(ok.report.gaps, []);
  assert.equal(ok.report.counts.concepts, 9);
  assert.equal(ok.report.counts.documents, 3);
  const dirty = gitFixture(t, { 'tech/A.md': broken, 'tech/B.md': '# B\n[[Missing]]\n' });
  const failed = run('validate', '--repo', dirty.repo);
  assert.equal(failed.code, 1);
  assert.deepEqual(failed.report.gaps.map((gap) => gap.reason), ['unresolved_relation'],
    'body link gaps are not ontology violations');
  assert.equal(existsSync(defaultCacheDir(dirty.repo)), false, 'validate never writes a snapshot');
  // On a clean fixture --staged alone exits 0, so exit 1 here can only come from refusing --cache.
  const cached = spawnSync(process.execPath, [cli, 'validate', '--staged', '--cache', clean.cacheDir, '--repo', clean.repo],
    { encoding: 'utf8' });
  assert.deepEqual([cached.status, cached.stdout], [1, '']);
  assert.equal(cached.stderr, 'invalid_arguments: validate reads committed or staged Git trees and accepts --repo only.\n');
});

test('validate --staged blocks only violations the staged change introduces', (t) => {
  const fixture = gitFixture(t, { ...CONCEPT_FILES, 'tech/A.md': broken });
  // Inserting a valid relation shifts the pre-existing violation to index 1; it stays a warning.
  fixture.write({ 'tech/A.md': '---\nontology_relations:\n'
    + '  - {subject: "[[#A]]", predicate: mentions, target: "concept:transactional-outbox"}\n'
    + '  - {predicate: mentions, target: "concept:missing"}\n---\n# A\n' });
  fixture.git('add', 'tech/A.md');
  const shifted = run('validate', '--staged', '--repo', fixture.repo);
  assert.equal(shifted.code, 0);
  assert.deepEqual(shifted.report.violations, []);
  assert.deepEqual(shifted.report.warnings.map((gap) => [gap.reason, gap.evidence_unit_id.split(':').at(-1)]),
    [['unresolved_relation', 'frontmatter.ontology_relations[1]']]);
  assert.equal(shifted.report.counts.typed_relations, 16);

  fixture.write({ 'tech/B.md': '---\nontology_relations:\n'
    + '  - {subject: "concept:dual-write-problem", predicate: addresses, target: "concept:relay-lag", evidence: "[[Outbox#문제]]"}\n'
    + '---\n# B\n' });
  fixture.git('add', 'tech/B.md');
  // Only the staged content counts: a later unstaged fix in the worktree is not read.
  fixture.write({ 'tech/B.md': '# B\n' });
  const introduced = run('validate', '--staged', '--repo', fixture.repo);
  assert.equal(introduced.code, 1);
  assert.equal(introduced.report.ok, false);
  assert.deepEqual(introduced.report.violations.map((gap) => [gap.source_uri, gap.reason]), [['tech/B.md', 'domain_violation']]);
  assert.match(introduced.report.violations[0].message, /requires subject type Approach, not Problem/);
  assert.equal(introduced.report.warnings.length, 1);
  assert.match(introduced.report.tree, /^[a-f0-9]{40}$/);
  assert.equal(existsSync(defaultCacheDir(fixture.repo)), false);
});

test('validate --staged counts identical gaps as a multiset', (t) => {
  const fixture = gitFixture(t, { ...CONCEPT_FILES, 'tech/A.md': broken });
  // HEAD has one copy of the gap; the staged file has three identical copies.
  fixture.write({ 'tech/A.md': `---\nontology_relations:\n${'  - {predicate: mentions, target: "concept:missing"}\n'.repeat(3)}---\n# A\n` });
  fixture.git('add', 'tech/A.md');
  const { code, report } = run('validate', '--staged', '--repo', fixture.repo);
  assert.equal(code, 1);
  const unit = (gap) => gap.evidence_unit_id.split(':').at(-1);
  assert.deepEqual(report.warnings.map(unit), ['frontmatter.ontology_relations[0]']);
  assert.deepEqual(report.violations.map(unit), ['frontmatter.ontology_relations[1]', 'frontmatter.ontology_relations[2]'],
    'both new copies are reported');
});

test('validate --staged keeps a pre-existing hierarchy cycle a warning when declarations shift', (t) => {
  const path = 'ontology/vocabulary/Vocabulary-Cycle.md';
  const cycle = (...extra) => ['---', 'status: vocabulary', 'ontology_concepts:', ...extra,
    '  - {id: cache, type: Topic, label: Cache, broader: queue}',
    '  - {id: queue, type: Topic, label: Queue, broader: stream}',
    '  - {id: stream, type: Topic, label: Stream, broader: cache}', '---', '# Cycle', ''].join('\n');
  const fixture = gitFixture(t, { [path]: cycle() });
  const message = 'concept:interview-vault:stream broader concept:interview-vault:cache closes a cycle.';
  assert.deepEqual(run('validate', '--repo', fixture.repo).report.gaps.map((gap) => gap.message), [message]);
  // The insertion shifts every edge ID; with these slugs the greatest one moves from queue to cache.
  fixture.write({ [path]: cycle('  - {id: buffer, type: Topic, label: Buffer}') });
  fixture.git('add', path);
  const staged = run('validate', '--staged', '--repo', fixture.repo);
  assert.equal(staged.code, 0, JSON.stringify(staged.report.violations));
  assert.deepEqual(staged.report.warnings.map((gap) => gap.message), [message]);
});

test('validate --staged warns on a new undeclared category unless the Category concepts change', (t) => {
  const fixture = gitFixture(t, CONCEPT_FILES);
  const vocabulary = 'ontology/vocabulary/Vocabulary-Messaging.md';
  fixture.write({ 'tech/New.md': '---\ncategory: Brand New\n---\n# New\n',
    [vocabulary]: CONCEPT_FILES[vocabulary].replace('Messaging, aliases: [메시징]}', 'Messaging, aliases: [메시징, 메시지]}') });
  fixture.git('add', '.');
  const unrelated = run('validate', '--staged', '--repo', fixture.repo);
  assert.equal(unrelated.code, 0, JSON.stringify(unrelated.report.violations));
  assert.deepEqual(unrelated.report.warnings.map((gap) => [gap.source_uri, gap.reason]), [['tech/New.md', 'undeclared_category']]);

  fixture.git('reset', '-q');
  fixture.write({ [vocabulary]: CONCEPT_FILES[vocabulary].replace(', aliases: [Technology]', '') });
  fixture.git('add', vocabulary);
  const changed = run('validate', '--staged', '--repo', fixture.repo);
  assert.equal(changed.code, 1);
  assert.deepEqual(changed.report.violations.map((gap) => [gap.source_uri, gap.reason]), [['tech/Relay.md', 'undeclared_category']]);
});

test('candidates --check verifies shape, schema, endpoints, evidence and the verbatim quote against HEAD', (t) => {
  const fixture = gitFixture(t, CONCEPT_FILES);
  const line = (fields) => JSON.stringify({ home: 'tech/Outbox.md', status: 'candidate', proposed_by: 'model',
    proposed_at: '2026-11-19', ...fields });
  const evidence = (heading, quote) => ({ path: 'tech/Outbox.md', heading, quote });
  const reviewed = { status: 'rejected', reviewed_by: 'reviewer', reviewed_at: '2026-11-19' };
  const valid = join(fixture.root, 'valid.jsonl');
  writeFileSync(valid, [
    line({ id: 'c-1', kind: 'concept', slug: 'ordering-loss', type: 'Problem', label: 'Ordering Loss', broader: 'delivery-guarantee',
      evidence: evidence('대안', 'CDC로   커밋 로그를\n읽어 발행한다.') }),
    line({ id: 'c-2', kind: 'relation', subject: 'concept:cdc-relay', predicate: 'addresses', target: 'concept:ordering-loss',
      evidence: evidence('대안', 'CDC로 커밋 로그를 읽어') }),
    line({ id: 'c-3', kind: 'relation', subject: '[[Outbox#문제]]', predicate: 'mentions', target: 'concept:dual-write-problem',
      evidence: evidence('문제', '하나만 성공할 수 있다.') }),
    line({ id: 'c-4', kind: 'concept', slug: 'partition-ordering', type: 'Topic', label: 'Partition Ordering', broader: 'ordering-loss',
      evidence: evidence('대안', 'CDC로') }),
    '',
  ].join('\n'));
  const accepted = run('candidates', '--check', valid, '--repo', fixture.repo);
  assert.equal(accepted.code, 0, JSON.stringify(accepted.report.problems));
  assert.deepEqual([accepted.report.ok, accepted.report.checked_lines], [true, 4]);

  const invalid = join(fixture.root, 'invalid.jsonl');
  writeFileSync(invalid, [
    'not json',
    line({ id: 'd-1', kind: 'concept', slug: 'Bad Slug', type: 'Thing', label: 'X', evidence: evidence('문제', 'DB와'), note: 1 }),
    line({ id: 'd-1', kind: 'relation', subject: 'concept:dual-write-problem', predicate: 'addresses',
      target: 'concept:relay-lag', evidence: evidence('문제', 'DB와') }),
    line({ id: 'd-3', kind: 'relation', subject: 'concept:cdc-relay', predicate: 'declares', target: 'concept:relay-lag',
      evidence: evidence('문제', 'DB와') }),
    line({ id: 'd-4', kind: 'relation', subject: 'concept:cdc-relay', predicate: 'addresses', target: 'concept:nowhere',
      evidence: evidence('없는 절', 'DB와') }),
    line({ id: 'd-5', kind: 'relation', subject: 'concept:cdc-relay', predicate: 'has_tradeoff', target: 'concept:relay-lag',
      evidence: evidence('비용', '근거에 없는 문장') }),
    line({ id: 'd-6', kind: 'relation', subject: 'concept:cdc-relay', predicate: 'addresses', target: 'concept:nowhere',
      evidence: evidence('없는 절', 'x'), status: 'rejected', reviewed_by: 'reviewer', reviewed_at: '2026-11-19' }),
    line({ id: 'd-7', kind: 'relation', target: 'concept:relay-lag', predicate: 'requires', evidence: evidence('문제', 'DB와'),
      status: 'approved' }),
    // Rejected lines are records: an out-of-schema or unresolvable proposal never fails the check.
    line({ ...reviewed, id: 'd-8', kind: 'concept', slug: 'Bad Slug', type: 'Thing', label: 'X', home: 'tech/Nowhere.md',
      evidence: evidence('없는 절', 'x') }),
    line({ ...reviewed, id: 'd-9', kind: 'relation', subject: '[[#문제]]', predicate: 'declares', target: 'concept:nowhere',
      evidence: evidence('문제', 'x') }),
    line({ ...reviewed, id: 'd-10', kind: 'concept', slug: 'rejected-idea', type: 'Problem', label: 'Rejected Idea',
      evidence: evidence('문제', 'DB와') }),
    line({ id: 'd-11', kind: 'relation', subject: 'concept:cdc-relay', predicate: 'addresses', target: 'concept:rejected-idea',
      evidence: evidence('문제', 'DB와') }),
    line({ id: 'd-12', kind: 'concept', slug: 'twin', type: 'Problem', label: 'Twin', evidence: evidence('문제', 'DB와') }),
    line({ id: 'd-13', kind: 'concept', slug: 'twin', type: 'Problem', label: 'Twin Again', evidence: evidence('문제', 'DB와') }),
    line({ id: 'd-14', kind: 'concept', slug: 'orphan-child', type: 'Topic', label: 'Orphan Child', broader: 'nowhere-parent',
      evidence: evidence('문제', 'DB와') }),
    line({ id: 'd-15', kind: 'relation', subject: '[[#문제]]', predicate: 'mentions', target: 'concept:dual-write-problem',
      evidence: evidence('문제', 'DB와') }),
  ].join('\n'));
  const rejected = run('candidates', '--check', invalid, '--repo', fixture.repo);
  assert.equal(rejected.code, 1);
  const byLine = (number) => rejected.report.problems.filter((item) => item.line === number).map((item) => item.problem);
  assert.deepEqual(byLine(1), ['line is not valid JSON']);
  assert.deepEqual(byLine(2), ['unsupported fields: note', 'slug must match ^[a-z0-9][a-z0-9-]{0,79}$',
    'type must be one of Topic, Category, Problem, Approach, Condition, Tradeoff']);
  assert.deepEqual(byLine(3), ['id d-1 is duplicated', 'domain: addresses requires subject type Approach, not Problem',
    'range: addresses requires target type Problem, not Tradeoff']);
  assert.deepEqual(byLine(4), ['predicate declares is not an authorable predicate']);
  assert.deepEqual(byLine(5), ['target concept:nowhere does not resolve to an indexed or proposed entity',
    'evidence tech/Outbox.md#없는 절 does not resolve to one Section: unresolved_anchor']);
  assert.deepEqual(byLine(6), ['quote does not occur in tech/Outbox.md#비용']);
  assert.deepEqual(byLine(7), [], 'rejected candidates get shape checks only');
  assert.deepEqual(byLine(8), ['reviewed_by must be a non-empty string', 'reviewed_at must be a non-empty string',
    'subject is required in a candidate line, because approved lines move into a declaration document',
    'subject (home) does not resolve to an indexed or proposed entity', 'range: requires requires target type Condition, not Tradeoff']);
  assert.deepEqual([9, 10, 11].map(byLine), [[], [], []]);
  assert.deepEqual(byLine(12), ['target concept:rejected-idea does not resolve to an indexed or proposed entity'],
    'a rejected concept proposes nothing');
  assert.deepEqual([byLine(13), byLine(14)], [[], ['slug twin is already proposed on line 13']]);
  assert.deepEqual(byLine(15), ['broader nowhere-parent does not resolve to an indexed or proposed concept']);
  assert.deepEqual(byLine(16), ['subject [[#문제]] is a same-document wikilink; name the document, '
    + 'because approved lines move into a declaration document']);
});
