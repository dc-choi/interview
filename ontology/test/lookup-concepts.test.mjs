import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CONCEPT_QUERY_EXPANSION, lookup, search } from '../src/query.mjs';
import { buildSnapshot } from '../src/snapshot.mjs';
import { CONCEPT_FILES, gitFixture } from './ontology-fixture.mjs';

// Recorded with the schema 1 / extractor 12 code (HEAD f5681066) for the same
// pinned commit. Only version strings and the fingerprints that hash them differ.
const BASELINE = JSON.parse(readFileSync(new URL('./fixtures/concept-free-baseline.json', import.meta.url)));
const MASKED = new Set(['fingerprint', 'manifest_hash', 'schema_version', 'extractor_version', 'extraction_version']);
const mask = (value) => JSON.stringify(value, (key, item) => MASKED.has(key) ? '<masked>' : item);

function fixture(t, files, scopes) {
  const item = gitFixture(t, files);
  buildSnapshot({ ...item, ...(scopes ? { scopes } : {}) });
  return { repo: item.repo, cacheDir: item.cacheDir, allowlist: scopes ?? ['README.md', 'biz', 'econ', 'fit', 'ontology', 'tech'] };
}

test('lookup and search on a snapshot without concepts match the recorded schema 1 output byte for byte', (t) => {
  const item = gitFixture(t, {
    'tech/Alpha.md': '---\naliases: [Alpha Pattern]\ntags: [retry, messaging]\ncategory: tech\nstatus: done\n---\n# Alpha\n\n## Retry\n\n'
      + 'Retry the delivery with backoff. [[Beta#Consumer]] [[Missing]]\n\n## Notes\n\nOrdering matters for retry queues.\n',
    'tech/Beta.md': '# Beta\n\n## Consumer\n\nThe consumer deduplicates retry deliveries.\n',
    'tech/Gamma.md': '---\ntags: [ordering]\n---\n# Gamma\n\nQueue ordering and partition keys.\n',
  }, { date: '2026-01-01T00:00:00Z' });
  assert.equal(item.git('rev-parse', 'HEAD'), BASELINE.revision);
  buildSnapshot({ ...item, scopes: ['tech'] });
  const options = { repo: item.repo, cacheDir: item.cacheDir, allowlist: ['tech'] };
  const current = {
    revision: BASELINE.revision,
    lookup_lexical: lookup(options, { query: 'retry delivery ordering', max_bytes: 24000 }),
    lookup_alias: lookup(options, { query: 'Alpha Pattern' }),
    search: search(options, { query: 'retry' }),
  };
  assert.equal(mask(current), mask(BASELINE));
  for (const result of [current.lookup_lexical, current.lookup_alias]) {
    assert.equal(Object.hasOwn(result, 'concepts'), false);
    assert.equal(Object.hasOwn(result.matching, 'expanded_terms'), false);
  }
});

test('vocabulary documents are never lookup or search roots, traversal peers or evidence', (t) => {
  const options = fixture(t, {
    ...CONCEPT_FILES,
    'tech/Linker.md': '# Linker\n\nSee [[Vocabulary-Messaging]] for vocabulary text.\n',
  });
  const query = 'transactional outbox vocabulary text';
  for (const result of [lookup(options, { query, depth: 2 }), lookup(options, { query: 'Messaging vocabulary' })]) {
    assert.ok(result.evidence_units.length > 0);
    assert.equal(JSON.stringify(result.evidence_units).includes('ontology/vocabulary'), false);
    assert.equal(result.entities.some((entity) => entity.status === 'vocabulary'), false);
  }
  assert.equal(search(options, { query }).candidates.some((item) => item.source_uri.startsWith('ontology/vocabulary')), false);
});

test('a query n-gram naming a concept adds its other labels as lookup terms', (t) => {
  const options = fixture(t, {
    'ontology/vocabulary/Vocabulary-Patterns.md': '---\nstatus: vocabulary\nontology_concepts:\n'
      + '  - {id: transactional-outbox, type: Topic, label: Transactional Outbox, aliases: ["아웃박스 패턴"]}\n---\n# Patterns\n',
    'tech/English.md': '# Delivery\n\nThe transactional outbox stores events in the same database transaction.\n',
    'tech/Other.md': '# Other\n\n언제 쓰나 고민한다.\n',
  });
  const result = lookup(options, { query: '아웃박스 패턴은 언제 쓰나', max_bytes: 24000 });
  if (!CONCEPT_QUERY_EXPANSION) {
    assert.equal(Object.hasOwn(result.matching, 'expanded_terms'), false);
    return;
  }
  assert.deepEqual(result.matching.expanded_terms, ['transactional', 'outbox']);
  assert.equal(result.matching.query_term_count, 6);
  assert.ok(result.evidence_units.some((unit) => unit.source_uri === 'tech/English.md'));
  assert.equal(Object.hasOwn(search(options, { query: '아웃박스 패턴은 언제 쓰나' }).matching, 'expanded_terms'), false,
    'context_search keeps its lexical terms');
  assert.equal(Object.hasOwn(lookup(options, { query: 'database transaction' }).matching, 'expanded_terms'), false);
});

test('lookup hints the concepts declared in or supported by its root documents within the budget', (t) => {
  const options = fixture(t, CONCEPT_FILES);
  const result = lookup(options, { query: 'Transactional Outbox', max_bytes: 24000 });
  // The concept whose label shares the query tokens comes first.
  assert.deepEqual(result.concepts.map((item) => item.id.split(':').at(-1)),
    ['transactional-outbox', 'cdc-relay', 'dual-write-problem', 'relay-lag']);
  assert.deepEqual(Object.keys(result.concepts[0]), ['id', 'type', 'label']);
  assert.equal(Buffer.byteLength(JSON.stringify(result)), result.budget.used_bytes);
  const tight = lookup(options, { query: 'Transactional Outbox', max_bytes: result.budget.used_bytes - 60 });
  assert.ok((tight.concepts?.length ?? 0) < result.concepts.length, 'hints use only the space left by evidence');
  assert.ok(tight.evidence_units.length > 0);
  assert.equal(Buffer.byteLength(JSON.stringify(tight)), tight.budget.used_bytes);
  assert.ok(tight.budget.used_bytes <= result.budget.used_bytes - 60);
  const polling = lookup(options, { query: 'Polling' });
  assert.deepEqual([...new Set(polling.evidence_units.map((unit) => unit.source_uri))], ['tech/Relay.md']);
  assert.equal(Object.hasOwn(polling, 'concepts'), false, 'a root that only mentions a concept gets no hint');
});

// Ten concepts, declared in a vocabulary file, are each supported by a Section of
// one knowledge document, so the document's own bytes do not depend on them.
const QUEUE_GUIDE = ['# Queue Guide', '## Retry', 'Retry failed deliveries with backoff.', '## Ordering',
  'Partition keys keep per-key order.', '## Visibility', 'A consumer hides a message while it works.', '## Batching',
  'Group requests to cut overhead.', '## Throughput', 'Scale consumers horizontally.', '## Monitoring',
  'Watch the age of the oldest item.', '## Dead Letter',
  'Move poison messages aside after repeated failures so one bad payload cannot block the consumers behind it.',
  '## Format', 'Use a versioned envelope schema.', ''].join('\n');
const QUEUE_CONCEPTS = [['a-retry', 'Retry Policy', 'Retry'], ['b-ordering', 'Ordering Key', 'Ordering'],
  ['c-visibility', 'Visibility Timeout', 'Visibility'], ['d-batching', 'Batching', 'Batching'],
  ['e-throughput', 'Throughput', 'Throughput'], ['f-monitoring', 'Queue Monitoring', 'Monitoring'],
  ['g-format', 'Envelope Format', 'Format'], ['h-backoff', 'Backoff', 'Retry'],
  ['p-poison-overview', 'Poison Messages Overview', 'Format'], ['z-dead-letter', 'Dead Letter Queue', 'Dead Letter']]
  .map(([slug, label, heading]) => `  - {id: ${slug}, type: Topic, label: ${label}, evidence: "[[Queue#${heading}]]"}`);
const queueFiles = (concepts) => ({ 'tech/Queue.md': QUEUE_GUIDE, 'ontology/vocabulary/Vocabulary-Queue.md':
  ['---', 'status: vocabulary', ...(concepts.length > 0 ? ['ontology_concepts:', ...concepts] : []), '---', '# Queue vocabulary', '']
    .join('\n') });
const evidencePart = (pack) => ({ result_status: pack.result_status, exhausted: pack.budget.exhausted,
  omitted: pack.budget.omitted_evidence_units, entities: pack.entities, relations: pack.relations,
  units: pack.evidence_units.map(({ source_revision: _revision, ...unit }) => unit) });

// At 24,000 the hints fit in bytes the evidence leaves; at the three small budgets a
// twentieth cannot hold one, so none is reserved and the evidence never changes.
test('hints put the concept of a returned section first, then query-token overlap, and never change evidence below the reservation', (t) => {
  const withConcepts = fixture(t, queueFiles(QUEUE_CONCEPTS));
  const withoutConcepts = fixture(t, queueFiles([]));
  const query = 'poison messages';
  const result = lookup(withConcepts, { query, max_bytes: 24000 });
  assert.deepEqual(result.evidence_units.map((unit) => unit.anchor.heading_path.at(-1)), ['Dead Letter']);
  // Ten candidates on one document: concept id order alone would cut z-dead-letter and p-poison-overview.
  assert.deepEqual(result.concepts.map((item) => item.id.split(':').at(-1)), ['z-dead-letter', 'p-poison-overview',
    'a-retry', 'b-ordering', 'c-visibility', 'd-batching', 'e-throughput', 'f-monitoring']);
  // Hints only fill space the evidence leaves; the evidence is the same as without any concept.
  const plain = lookup(withoutConcepts, { query, max_bytes: 24000 });
  assert.equal(Object.hasOwn(plain, 'concepts'), false);
  const smallest = Buffer.byteLength(JSON.stringify({ concepts: [result.concepts[0]] }));
  for (const max_bytes of [24000, plain.budget.used_bytes + 200, plain.budget.used_bytes, plain.budget.used_bytes - 40]) {
    if (max_bytes < 24000) assert.ok(max_bytes / 20 < smallest, String(max_bytes));
    const hinted = lookup(withConcepts, { query, max_bytes });
    assert.deepEqual(evidencePart(hinted), evidencePart(lookup(withoutConcepts, { query, max_bytes })), String(max_bytes));
    assert.ok(hinted.budget.used_bytes <= max_bytes);
  }
  assert.equal(lookup(withConcepts, { query, max_bytes: plain.budget.used_bytes - 40 }).evidence_units[0].truncated, true);
});

// One long Section that a completed excerpt returns whole, the concepts of the vocabulary
// file and the relations of a fit/ document the caller's allowlist can hide.
const deadLetterFiles = (concepts, relations = []) => ({
  'tech/Queue.md': ['# Queue Guide', '## Dead Letter',
    'Move poison messages aside after repeated failures so one bad payload cannot block the queue. '.repeat(30).trim(),
    '## Retry', 'Retry failed deliveries with backoff.', ''].join('\n'),
  'ontology/vocabulary/Vocabulary-Queue.md': ['---', 'status: vocabulary',
    ...(concepts.length > 0 ? ['ontology_concepts:', ...concepts] : []), '---', '# Queue vocabulary', ''].join('\n'),
  'fit/Private.md': ['---', ...(relations.length > 0 ? ['ontology_relations:', ...relations] : []), '---',
    '# Private', '## Notes', 'Private notes.', ''].join('\n'),
});
const fits = (pack, max_bytes) => {
  assert.equal(Buffer.byteLength(JSON.stringify(pack)), pack.budget.used_bytes);
  assert.ok(pack.budget.used_bytes <= max_bytes, `${pack.budget.used_bytes} > ${max_bytes}`);
};

test('a hint a returned unit supports takes the bytes it needs from excerpts when evidence fills the budget', (t) => {
  const withConcepts = fixture(t, deadLetterFiles([
    '  - {id: dead-letter, type: Approach, label: Dead Letter Queue, evidence: "[[Queue#Dead Letter]]"}']));
  const withoutConcepts = fixture(t, deadLetterFiles([]));
  const query = 'poison messages';
  // Evidence alone fills this budget: before the reservation no hint fit in it.
  const full = lookup(withoutConcepts, { query, max_bytes: 24000 }).budget.used_bytes;
  const plain = lookup(withoutConcepts, { query, max_bytes: full });
  const hinted = lookup(withConcepts, { query, max_bytes: full });
  const hint = { id: 'concept:interview-vault:dead-letter', type: 'Approach', label: 'Dead Letter Queue', evidence_unit_index: 0 };
  assert.deepEqual(hinted.concepts, [hint]);
  fits(hinted, full);
  // The same unit stays; only the end of its excerpt goes, within a twentieth of the budget.
  const [before] = plain.evidence_units;
  const [after] = hinted.evidence_units;
  assert.deepEqual(hinted.evidence_units.map((unit) => unit.id), [before.id]);
  assert.ok(before.excerpt.startsWith(after.excerpt));
  const cut = Buffer.byteLength(before.excerpt) - Buffer.byteLength(after.excerpt);
  assert.ok(cut > 0 && cut <= full / 20, String(cut));
  assert.deepEqual([before.truncated, after.truncated, plain.result_status, hinted.result_status, hinted.budget.exhausted],
    [false, true, 'ok', 'partial', true]);
  // Every budget keeps the hard limit and the unit. A cut never leaves an excerpt under
  // 512 bytes; when the hint would need that, it is not reserved and the response is the
  // concept-free one, flags included.
  const hintBytes = Buffer.byteLength(JSON.stringify({ concepts: [hint] }));
  let shown = 0;
  for (let max_bytes = 2400; max_bytes <= full + 200; max_bytes += 50) {
    const result = lookup(withConcepts, { query, max_bytes });
    fits(result, max_bytes);
    assert.deepEqual(result.evidence_units.map((unit) => unit.id), [before.id], String(max_bytes));
    const bare = lookup(withoutConcepts, { query, max_bytes });
    if (result.concepts) {
      assert.deepEqual(result.concepts, [hint], String(max_bytes));
      const original = Buffer.byteLength(bare.evidence_units[0].excerpt);
      assert.ok(Buffer.byteLength(result.evidence_units[0].excerpt) >= Math.min(original, 512), String(max_bytes));
      shown += 1;
    } else {
      assert.ok(hintBytes > max_bytes / 20 || Buffer.byteLength(bare.evidence_units[0].excerpt) < 512 + hintBytes, String(max_bytes));
      assert.deepEqual(evidencePart(result), evidencePart(bare), String(max_bytes));
    }
  }
  assert.ok(shown > 0);
});

test('a cut never leaves an excerpt under 512 bytes; otherwise the hint is dropped and the response is unchanged', (t) => {
  // A short hint fits a twentieth of small budgets, where the only excerpt is already short.
  const withConcepts = fixture(t, deadLetterFiles(['  - {id: dl, type: Approach, label: DLQ, evidence: "[[Queue#Dead Letter]]"}']));
  const withoutConcepts = fixture(t, deadLetterFiles([]));
  const query = 'poison messages';
  const hint = { id: 'concept:interview-vault:dl', type: 'Approach', label: 'DLQ', evidence_unit_index: 0 };
  const hintBytes = Buffer.byteLength(JSON.stringify({ concepts: [hint] }));
  let dropped = 0;
  let shown = 0;
  for (let max_bytes = 2000; max_bytes <= 3000; max_bytes += 10) {
    const result = lookup(withConcepts, { query, max_bytes });
    const bare = lookup(withoutConcepts, { query, max_bytes });
    fits(result, max_bytes);
    const original = Buffer.byteLength(bare.evidence_units[0].excerpt);
    if (result.concepts) {
      assert.deepEqual(result.concepts, [hint], String(max_bytes));
      assert.ok(Buffer.byteLength(result.evidence_units[0].excerpt) >= Math.min(original, 512), String(max_bytes));
      shown += 1;
    } else {
      // The flags set for a failed cut are restored with the evidence.
      assert.deepEqual(evidencePart(result), evidencePart(bare), String(max_bytes));
      if (hintBytes <= max_bytes / 20) dropped += 1;
    }
  }
  assert.ok(dropped > 0 && shown > 0, `${dropped} ${shown}`);
});

test('without a returned unit supporting a concept nothing is reserved and evidence matches a concept-free snapshot', (t) => {
  const withConcepts = fixture(t, deadLetterFiles([
    '  - {id: retry-policy, type: Approach, label: Retry Policy, evidence: "[[Queue#Retry]]"}']));
  const withoutConcepts = fixture(t, deadLetterFiles([]));
  const query = 'poison messages';
  // The concept's Section is in the root document but not returned: a leftover-space hint.
  assert.deepEqual(lookup(withConcepts, { query, max_bytes: 24000 }).concepts,
    [{ id: 'concept:interview-vault:retry-policy', type: 'Approach', label: 'Retry Policy' }]);
  const full = lookup(withoutConcepts, { query, max_bytes: 24000 }).budget.used_bytes;
  for (const max_bytes of [full, full - 300, 3000, 2600]) {
    const hinted = lookup(withConcepts, { query, max_bytes });
    fits(hinted, max_bytes);
    assert.deepEqual(evidencePart(hinted), evidencePart(lookup(withoutConcepts, { query, max_bytes })), String(max_bytes));
  }
  assert.equal(Object.hasOwn(lookup(withConcepts, { query, max_bytes: full }), 'concepts'), false);
});

test('a relation assertion outside the allowlist neither hints its concepts nor cuts evidence', (t) => {
  const files = deadLetterFiles([
    '  - {id: dead-letter, type: Approach, label: Dead Letter Queue, evidence: "[[Queue#Retry]]"}',
    '  - {id: poison-message, type: Problem, label: Poison Message, evidence: "[[Queue#Retry]]"}',
  ], ['  - {subject: "concept:dead-letter", predicate: addresses, target: "concept:poison-message", evidence: "[[Queue#Dead Letter]]"}']);
  const hidden = { ...fixture(t, files), allowlist: ['ontology', 'tech'] };
  const withoutConcepts = { ...fixture(t, deadLetterFiles([])), allowlist: ['ontology', 'tech'] };
  const query = 'poison messages';
  const full = lookup(withoutConcepts, { query, max_bytes: 24000 }).budget.used_bytes;
  const scoped = lookup(hidden, { query, max_bytes: full });
  fits(scoped, full);
  assert.equal(Object.hasOwn(scoped, 'concepts'), false);
  assert.deepEqual(evidencePart(scoped), evidencePart(lookup(withoutConcepts, { query, max_bytes: full })));
  assert.equal(lookup(hidden, { query, max_bytes: 24000 }).concepts.some((item) => Object.hasOwn(item, 'evidence_unit_index')), false);
  // With the asserting document visible, the Section the assertion cites supports both ends.
  const visible = lookup({ ...hidden, allowlist: ['fit', 'ontology', 'tech'] }, { query, max_bytes: 24000 });
  fits(visible, 24000);
  assert.deepEqual(visible.concepts.map((item) => [item.id.split(':').at(-1), item.evidence_unit_index]),
    [['poison-message', 0], ['dead-letter', 0]]);
});
