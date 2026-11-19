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

test('hints put the concept of a returned section first, then query-token overlap, and never change evidence', (t) => {
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
  const evidence = (pack) => ({ result_status: pack.result_status, exhausted: pack.budget.exhausted,
    omitted: pack.budget.omitted_evidence_units, entities: pack.entities, relations: pack.relations,
    units: pack.evidence_units.map(({ source_revision: _revision, ...unit }) => unit) });
  for (const max_bytes of [24000, plain.budget.used_bytes + 200, plain.budget.used_bytes, plain.budget.used_bytes - 40]) {
    const hinted = lookup(withConcepts, { query, max_bytes });
    assert.deepEqual(evidence(hinted), evidence(lookup(withoutConcepts, { query, max_bytes })), String(max_bytes));
    assert.ok(hinted.budget.used_bytes <= max_bytes);
  }
  assert.equal(lookup(withConcepts, { query, max_bytes: plain.budget.used_bytes - 40 }).evidence_units[0].truncated, true);
});
