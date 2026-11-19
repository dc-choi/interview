import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { conceptQuery } from '../src/concept.mjs';
import { ContextError, DEFAULT_SCOPES } from '../src/core.mjs';
import { lookup } from '../src/query.mjs';
import { readEvidence } from '../src/read-evidence.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';
import { CONCEPT_FILES, gitFixture } from './ontology-fixture.mjs';

const id = (slug) => `concept:interview-vault:${slug}`;
const view = (result) => result.relations.map((item) => [item.predicate, item.direction, item.peer.label, item.inferred,
  item.rule ?? null]);

function fixture(t, files = CONCEPT_FILES) {
  const item = gitFixture(t, files);
  const { fingerprint } = buildSnapshot(item);
  const options = { repo: item.repo, cacheDir: item.cacheDir, allowlist: [...DEFAULT_SCOPES] };
  const query = (args, allowlist) => conceptQuery({ ...options, ...(allowlist ? { allowlist } : {}) }, args);
  return { ...item, fingerprint, options, query };
}

test('a concept resolves by canonical id, shorthand, slug, label or alias key', (t) => {
  const { query } = fixture(t);
  for (const concept of [id('dual-write-problem'), 'concept:dual-write-problem', 'dual-write-problem',
    'DUAL write_problem', ' 이중쓰기 문제 ']) {
    const result = query({ concept });
    assert.equal(result.result_status, 'ok', concept);
    assert.equal(result.concept.id, id('dual-write-problem'));
  }
  const result = query({ concept: 'Dual Write Problem' });
  assert.deepEqual({ ...result.concept, definition_evidence: undefined }, { id: id('dual-write-problem'), type: 'Problem',
    label: 'Dual Write Problem', aliases: ['이중 쓰기 문제'], declared_in: 'tech/Outbox.md', definition_evidence: undefined });
  assert.deepEqual(result.concept.definition_evidence.map((item) => item.heading_path.at(-1)), ['1', '문제']);
  const missing = query({ concept: 'nothing like it' });
  assert.equal(missing.result_status, 'concept_not_found');
  assert.equal(missing.concept, null);
  assert.deepEqual(missing.candidates, []);
  assert.equal(Buffer.byteLength(JSON.stringify(missing)), missing.budget.used_bytes);
  // A partial name match is suggested, longest shared name first, and never resolved.
  const partial = query({ concept: 'Dual Write' });
  assert.equal(partial.result_status, 'concept_not_found');
  assert.equal(partial.concept, null);
  assert.deepEqual(partial.candidates.map((item) => item.id), [id('dual-write-problem')]);
  assert.deepEqual(partial.relations, []);
  assert.equal(query({ concept: 'the outbox pattern' }).candidates[0].id, id('transactional-outbox'));
});

test('a label key shared by two concepts returns ambiguous candidates', (t) => {
  const { query } = fixture(t, { 'tech/Queues.md': '---\nontology_concepts:\n'
    + '  - {id: job-queue, type: Topic, label: Job Queue, aliases: [Queue]}\n'
    + '  - {id: message-queue, type: Topic, label: Message Queue, aliases: [queue]}\n---\n# Queues\n' });
  const result = query({ concept: 'queue' });
  assert.equal(result.result_status, 'ambiguous_concept');
  assert.deepEqual(result.candidates.map((item) => item.id), [id('job-queue'), id('message-queue')]);
  assert.equal(result.candidates[0].declared_in, 'tech/Queues.md');
  assert.ok(result.coverage_gaps.some((gap) => gap.reason === 'concept_label_collision'));
  assert.equal(query({ concept: 'message queue' }).result_status, 'ok');
});

test('partial-name candidates rank the closest slug, label or alias first and count the ones cut', (t) => {
  // Nine names tie on the shared length, so only coverage puts the closest name first.
  const letters = [...'abcdefghi'];
  const { query } = fixture(t, { 'tech/Queues.md': ['---', 'ontology_concepts:',
    ...letters.map((letter) => `  - {id: ${letter}-worker, type: Topic, label: Queue Worker ${letter.toUpperCase()}}`),
    '  - {id: queue-slug, type: Topic, label: Unrelated Name}',
    '  - {id: z-queues, type: Topic, label: Plural, aliases: [Queues]}',
    '---', '# Queues', ''].join('\n') });
  const result = query({ concept: 'queue' });
  assert.equal(result.result_status, 'concept_not_found');
  assert.equal(result.concept, null);
  assert.deepEqual(result.relations, []);
  assert.deepEqual(result.candidates.map((item) => item.id), [id('z-queues'), id('queue-slug'),
    ...[...'abcdef'].map((letter) => id(`${letter}-worker`))]);
  assert.equal(result.budget.omitted_candidates, 3);
  const bounded = query({ concept: 'queue', max_bytes: result.budget.used_bytes - 200 });
  assert.ok(bounded.candidates.length < 8);
  assert.equal(bounded.candidates.length + bounded.budget.omitted_candidates, 11, 'the byte budget counts what it cuts');
  assert.equal(Buffer.byteLength(JSON.stringify(bounded)), bounded.budget.used_bytes);
  const exact = query({ concept: 'Queue Worker D' });
  assert.deepEqual([exact.result_status, exact.concept.id, exact.budget.omitted_candidates], ['ok', id('d-worker'), 0]);
});

test('symmetric and inverse rules present incoming edges from the concept and flag them inferred', (t) => {
  const { query } = fixture(t);
  assert.deepEqual(view(query({ concept: 'transactional-outbox' })), [
    ['addresses', 'out', 'Dual Write Problem', false, null],
    ['broader', 'out', 'Delivery Guarantee', false, null],
    ['has_tradeoff', 'out', 'Relay Lag', false, null],
    ['alternative_to', 'out', 'CDC Relay', true, 'symmetric'],
  ]);
  const problem = query({ concept: 'dual-write-problem' });
  assert.deepEqual(view(problem), [['addressed_by', 'out', 'Transactional Outbox', true, 'inverse']]);
  assert.equal(problem.relations[0].derived_from.length, 1);
  assert.deepEqual(view(query({ concept: 'dual-write-problem', include_inferred: false })),
    [['addresses', 'in', 'Transactional Outbox', false, null]]);
  assert.deepEqual(view(query({ concept: 'cdc-relay' })), [['alternative_to', 'out', 'Transactional Outbox', false, null]]);
});

test('a relation stated by two sources, or stated and inferred, is one row with the evidence of both', (t) => {
  const { query } = fixture(t, { ...CONCEPT_FILES, 'tech/Second.md': ['---', 'ontology_relations:',
    '  - {subject: "concept:transactional-outbox", predicate: addresses, target: "concept:dual-write-problem", evidence: "[[#Why]]"}',
    '  - {subject: "concept:transactional-outbox", predicate: alternative_to, target: "concept:cdc-relay", evidence: "[[#Why]]"}',
    '---', '# Second', '## Why', 'The outbox removes the dual write.', ''].join('\n') });
  const sources = (item) => item.evidence.map((entry) => `${entry.source_uri}#${entry.heading_path.at(-1)}`).sort();
  const outbox = query({ concept: 'transactional-outbox' });
  assert.deepEqual(view(outbox), [
    ['addresses', 'out', 'Dual Write Problem', false, null],
    ['alternative_to', 'out', 'CDC Relay', false, null],
    ['broader', 'out', 'Delivery Guarantee', false, null],
    ['has_tradeoff', 'out', 'Relay Lag', false, null],
  ]);
  assert.deepEqual(sources(outbox.relations[0]), ['tech/Outbox.md#0', 'tech/Outbox.md#해결: Outbox 테이블',
    'tech/Second.md#0', 'tech/Second.md#Why']);
  assert.deepEqual(sources(outbox.relations[1]), ['tech/Outbox.md#1', 'tech/Outbox.md#대안',
    'tech/Second.md#1', 'tech/Second.md#Why'], 'the symmetric reading adds its evidence to the stated row');
  assert.equal(Object.hasOwn(outbox.relations[1], 'derived_from'), false);
  const problem = query({ concept: 'dual-write-problem' });
  assert.deepEqual(view(problem), [['addressed_by', 'out', 'Transactional Outbox', true, 'inverse']]);
  assert.equal(problem.relations[0].derived_from.length, 2);
  assert.deepEqual(sources(problem.relations[0]), sources(outbox.relations[0]));
});

test('the transitive broader closure is bounded by depth and lists the asserted edges it derives from', (t) => {
  const { query } = fixture(t);
  assert.deepEqual(view(query({ concept: 'messaging' })), [['narrower', 'out', 'Messaging Reliability', true, 'inverse']]);
  assert.deepEqual(view(query({ concept: 'messaging', depth: 3 })), [
    ['narrower', 'out', 'Messaging Reliability', true, 'inverse'],
    ['narrower', 'out', 'Delivery Guarantee', true, 'transitive'],
    ['narrower', 'out', 'Transactional Outbox', true, 'transitive'],
  ]);
  const upward = query({ concept: 'transactional-outbox', depth: 2, predicates: ['broader'] });
  assert.deepEqual(view(upward), [
    ['broader', 'out', 'Delivery Guarantee', false, null],
    ['broader', 'out', 'Messaging Reliability', true, 'transitive'],
  ]);
  assert.equal(upward.relations[1].derived_from.length, 2);
  assert.deepEqual(upward.relations[1].evidence.map((item) => item.heading_path.join('.')), [
    'frontmatter.ontology_concepts.0', 'frontmatter.ontology_concepts.2']);
  assert.deepEqual(view(query({ concept: 'messaging', depth: 3, include_inferred: false })),
    [['broader', 'in', 'Messaging Reliability', false, null]]);
});

test('predicate filters accept inverse labels and type filters include subclasses', (t) => {
  const { query } = fixture(t);
  assert.deepEqual(view(query({ concept: 'relay-lag', predicates: ['tradeoff_of'] })),
    [['tradeoff_of', 'out', 'Transactional Outbox', true, 'inverse']]);
  assert.deepEqual(view(query({ concept: 'relay-lag', predicates: ['has_tradeoff'] })),
    [['tradeoff_of', 'out', 'Transactional Outbox', true, 'inverse']]);
  assert.deepEqual(view(query({ concept: 'relay-lag', types: ['EvidenceUnit'] })),
    [['contradicted_by', 'out', '비용', false, null]]);
  assert.deepEqual(view(query({ concept: 'relay-lag', types: ['Concept'] })),
    [['tradeoff_of', 'out', 'Transactional Outbox', true, 'inverse']]);
  assert.deepEqual(view(query({ concept: 'transactional-outbox', types: ['Problem'] })),
    [['addresses', 'out', 'Dual Write Problem', false, null]]);
  for (const args of [{ predicates: ['unknown'] }, { types: ['Thing'] }, { depth: 4 }, { include_inferred: 'yes' },
    { max_bytes: 0 }, { extra: true }]) {
    assert.throws(() => query({ concept: 'relay-lag', ...args }), (error) => error instanceof ContextError, JSON.stringify(args));
  }
});

test('documents list tagged, mentioning and categorized documents and, with inference, narrower concepts', (t) => {
  const { query } = fixture(t);
  const documents = (args) => query(args).documents.map((item) => [item.source_uri, item.predicate, item.concept_id, item.inferred]);
  assert.deepEqual(documents({ concept: 'transactional-outbox' }), [['tech/Relay.md', 'mentions', id('transactional-outbox'), false]]);
  assert.deepEqual(documents({ concept: 'messaging', depth: 2 }), [
    ['tech/Outbox.md', 'tagged_with', id('messaging'), false],
    ['tech/Relay.md', 'tagged_with', id('delivery-guarantee'), true],
  ]);
  assert.deepEqual(documents({ concept: 'messaging', depth: 2, include_inferred: false }),
    [['tech/Outbox.md', 'tagged_with', id('messaging'), false]]);
  assert.deepEqual(documents({ concept: 'Tech' }), [['tech/Outbox.md', 'in_category', id('tech-category'), false],
    ['tech/Relay.md', 'in_category', id('tech-category'), false]]);
  assert.deepEqual(documents({ concept: 'ontology-category' }), [], 'vocabulary documents are schema data, not results');
  assert.deepEqual(documents({ concept: 'messaging', depth: 2, predicates: ['mentions'] }), []);
});

test('returned evidence ids, including concept declarations, are readable with context_read', (t) => {
  const { query, options } = fixture(t);
  const result = query({ concept: 'transactional-outbox' });
  const addresses = result.relations.find((item) => item.predicate === 'addresses');
  assert.deepEqual(addresses.evidence.map((item) => item.heading_path.at(-1)), ['해결: Outbox 테이블', '0']);
  const revision = result.index_sync[0].revision;
  for (const item of [...addresses.evidence, ...result.concept.definition_evidence]) {
    const read = readEvidence({ repo: options.repo, cacheDir: options.cacheDir, allowlist: options.allowlist },
      { evidence_unit_id: item.evidence_unit_id, source_revision: revision, content_hash: item.content_hash });
    assert.equal(read.evidence_unit.source_uri, item.source_uri);
  }
});

test('the allowlist hides concepts, peers and evidence outside it', (t) => {
  const { query } = fixture(t);
  assert.equal(query({ concept: 'messaging' }, ['tech']).result_status, 'concept_not_found');
  const scoped = query({ concept: 'transactional-outbox' }, ['tech']);
  assert.equal(scoped.relations.some((item) => item.peer.label === 'Delivery Guarantee'), false);
  assert.ok(JSON.stringify(scoped).includes('ontology/vocabulary') === false);
});

test('an edge asserted outside the allowlist is ignored even between visible concepts', (t) => {
  const { options, query } = fixture(t, { ...CONCEPT_FILES, 'fit/Private.md': ['---', 'ontology_relations:',
    "  - {subject: 'concept:cdc-relay', predicate: addresses, target: 'concept:dual-write-problem', evidence: '[[#Secret]]'}",
    "  - {subject: 'concept:dual-write-problem', predicate: supported_by, target: '[[Outbox#대안]]'}",
    "  - {subject: '[[Relay#Polling]]', predicate: mentions, target: 'concept:cdc-relay'}",
    "  - {subject: 'concept:relay-lag', predicate: broader, target: 'concept:messaging'}",
    "  - {subject: 'concept:messaging', predicate: supported_by, target: '[[Relay#Polling]]'}",
    '---', '# Private', '## Secret', 'Private reasoning.', ''].join('\n') });
  const scoped = ['tech', 'ontology'];
  const relay = query({ concept: 'cdc-relay' }, scoped);
  assert.deepEqual(view(relay), [['alternative_to', 'out', 'Transactional Outbox', false, null]]);
  assert.deepEqual(relay.documents, [], 'a hidden mentions assertion lists no document');
  const problem = query({ concept: 'dual-write-problem' }, scoped);
  assert.deepEqual(view(problem), [['addressed_by', 'out', 'Transactional Outbox', true, 'inverse']]);
  assert.deepEqual(problem.concept.definition_evidence.map((item) => item.heading_path.at(-1)), ['1', '문제']);
  assert.equal(query({ concept: 'relay-lag' }, scoped).relations.some((item) => item.peer.label === 'Messaging'), false);
  assert.deepEqual(view(query({ concept: 'messaging', depth: 2 }, scoped)), [
    ['narrower', 'out', 'Messaging Reliability', true, 'inverse'],
    ['narrower', 'out', 'Delivery Guarantee', true, 'transitive'],
  ]);
  for (const concept of ['cdc-relay', 'dual-write-problem', 'relay-lag', 'messaging']) {
    const result = query({ concept, depth: 3 }, scoped);
    assert.equal(JSON.stringify(result).includes('fit/'), false, concept);
    assert.ok(result.relations.every((item) => item.evidence.length > 0), concept);
  }
  const full = query({ concept: 'cdc-relay' });
  const addresses = full.relations.find((item) => item.predicate === 'addresses');
  assert.equal(addresses.peer.label, 'Dual Write Problem');
  assert.deepEqual(addresses.evidence.map((item) => `${item.source_uri}#${item.heading_path.at(-1)}`),
    ['fit/Private.md#Secret', 'fit/Private.md#0']);
  assert.deepEqual(full.documents.map((item) => item.source_uri), ['tech/Relay.md']);
  // Lookup hints follow the same rule: a hidden assertion cannot attach a concept to a visible root.
  const hints = (allowlist) => lookup({ ...options, allowlist }, { query: 'Polling' }).concepts?.map((item) => item.label);
  assert.equal(hints(scoped), undefined);
  assert.deepEqual(hints([...DEFAULT_SCOPES]), ['Messaging']);
});

test('scoped gap messages never name concepts or paths outside the allowlist', (t) => {
  const { options, query } = fixture(t, {
    'fit/A.md': '---\nontology_concepts:\n  - {id: job-queue, type: Topic, label: Job Queue, aliases: [Queue]}\n---\n# A\n',
    'tech/B.md': '---\nontology_concepts:\n  - {id: message-queue, type: Topic, label: Message Queue, aliases: [queue]}\n---\n'
      + '# B\n\nMessage queue text.\n',
  });
  const scoped = { ...options, allowlist: ['tech'] };
  for (const result of [conceptQuery(scoped, { concept: 'queue' }), lookup(scoped, { query: 'Message Queue' })]) {
    const gap = result.coverage_gaps.find((item) => item.reason === 'concept_label_collision');
    assert.deepEqual([gap.source_uri, gap.evidence_unit_id, Object.hasOwn(gap, 'message')],
      ['tech/B.md', 'unit:interview-vault:tech/B.md:frontmatter.ontology_concepts[0]', false]);
    assert.equal(JSON.stringify(result).includes('job-queue'), false);
    assert.equal(JSON.stringify(result).includes('fit/'), false);
  }
  const full = query({ concept: 'message queue' });
  assert.match(full.coverage_gaps.find((item) => item.reason === 'concept_label_collision').message, /job-queue/);
});

test('a small budget drops documents before relations and never splits the concept', (t) => {
  const { query } = fixture(t);
  const full = query({ concept: 'messaging', depth: 3 });
  assert.equal(full.documents.length, 2);
  const results = [50, 900].map((less) => {
    const max_bytes = full.budget.used_bytes - less;
    const bounded = query({ concept: 'messaging', depth: 3, max_bytes });
    assert.equal(bounded.result_status, 'partial');
    assert.equal(bounded.budget.exhausted, true);
    assert.equal(bounded.concept.id, full.concept.id);
    assert.equal(bounded.budget.omitted_documents + bounded.documents.length, 2);
    assert.equal(Buffer.byteLength(JSON.stringify(bounded)), bounded.budget.used_bytes);
    assert.ok(bounded.budget.used_bytes <= max_bytes);
    return bounded;
  });
  assert.deepEqual([results[0].relations.length, results[0].documents.length], [3, 1]);
  assert.equal(results[1].documents.length, 0, 'documents go before any relation');
  assert.ok(results[1].budget.omitted_relations > 0);
  assert.throws(() => query({ concept: 'messaging', max_bytes: 200 }), (error) => error.code === 'budget_too_small');
});

test('inferred relations are computed at query time and never written to the snapshot', (t) => {
  const { cacheDir, fingerprint, repo } = fixture(t);
  const relations = readFileSync(join(cacheDir, 'snapshots', fingerprint, 'relations.jsonl'), 'utf8');
  for (const label of ['addressed_by', 'required_by', 'tradeoff_of', 'narrower', 'inferred']) {
    assert.equal(relations.includes(label), false, label);
  }
  const symmetric = loadSnapshot({ repo, cacheDir }).relations.filter((edge) => edge.predicate === 'alternative_to');
  assert.equal(symmetric.length, 1, 'only the asserted direction is stored');
});
