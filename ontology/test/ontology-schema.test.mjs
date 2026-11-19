import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { ASSERTION_PREDICATES, STRUCTURAL_PREDICATES, sha256 } from '../src/core.mjs';
import { extractMarkdown, wikilinkTarget } from '../src/markdown.mjs';
import { readBlob } from '../src/repository.mjs';
import { CLASSES, CONCEPT_TYPES, PREDICATES, isA } from '../src/schema.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';
import { CONCEPT_FILES, gitFixture } from './ontology-fixture.mjs';

const id = (slug) => `concept:interview-vault:${slug}`;
const edges = (snapshot, predicate) => snapshot.relations.filter((relation) => relation.predicate === predicate);
const has = (snapshot, subject, predicate, object) => snapshot.relations
  .some((relation) => relation.subject === subject && relation.predicate === predicate && relation.object === object);

function built(t, files) {
  const fixture = gitFixture(t, files);
  const result = buildSnapshot(fixture);
  return { ...fixture, result, snapshot: loadSnapshot(fixture) };
}

test('schema.json is generated from the schema module and core predicate lists derive from it', (t) => {
  const { cacheDir, result, snapshot } = built(t, { 'tech/A.md': '# A\n' });
  const schema = JSON.parse(readFileSync(join(cacheDir, 'snapshots', result.fingerprint, 'schema.json')));
  assert.deepEqual(schema, JSON.parse(JSON.stringify({ schema_version: '2', classes: CLASSES, predicates: PREDICATES })));
  assert.equal(snapshot.manifest.schema_version, '2');
  assert.equal(snapshot.manifest.extractor_version, '13');
  assert.deepEqual(ASSERTION_PREDICATES, PREDICATES.filter((item) => item.authorable).map((item) => item.name));
  assert.deepEqual(STRUCTURAL_PREDICATES, ['contains', 'links_to', 'declares', 'tagged_with', 'in_category']);
  assert.deepEqual(CONCEPT_TYPES, ['Topic', 'Category', 'Problem', 'Approach', 'Condition', 'Tradeoff']);
  assert.equal(isA('Problem', 'Concept'), true);
  assert.equal(isA('Section', 'EvidenceUnit'), true);
  assert.equal(isA('Document', 'Concept'), false);
  assert.deepEqual(Object.keys(result.counts), ['documents', 'units', 'relations', 'coverage_gaps', 'concepts',
    'typed_relations', 'tags_distinct', 'tags_mapped', 'tags_unmapped', 'categories_unmapped']);
});

test('concept declarations in block and flow style become anchored units and concepts with derived edges', (t) => {
  const { repo, snapshot } = built(t, CONCEPT_FILES);
  const outbox = snapshot.entities.find((entity) => entity.id === id('transactional-outbox'));
  assert.deepEqual(outbox, { id: id('transactional-outbox'), type: 'Approach', label: 'Transactional Outbox',
    aliases: ['아웃박스 패턴', 'Outbox'], source_uri: 'tech/Outbox.md', source_revision: snapshot.manifest.revision });
  const declarations = snapshot.entities.filter((entity) => entity.type === 'ConceptDeclaration');
  assert.equal(declarations.length, 9);
  const anchored = (unitId) => {
    const unit = declarations.find((item) => item.id === unitId);
    const bytes = readBlob(repo, snapshot.manifest.revision, unit.source_uri).subarray(unit.anchor.start_byte, unit.anchor.end_byte);
    assert.equal(unit.content_hash, `sha256:${sha256(bytes)}`);
    return bytes.toString();
  };
  assert.match(anchored('unit:interview-vault:tech/Outbox.md:frontmatter.ontology_concepts[0]'),
    /^id: transactional-outbox\n {4}type: Approach[\s\S]*broader: delivery-guarantee\n$/);
  assert.match(anchored('unit:interview-vault:tech/Outbox.md:frontmatter.ontology_concepts[1]'), /^\{id: dual-write-problem,.*\}$/);
  assert.deepEqual(declarations.find((item) => item.id.endsWith('Outbox.md:frontmatter.ontology_concepts[1]')).anchor.heading_path,
    ['frontmatter', 'ontology_concepts', '1']);
  const document = 'document:interview-vault:tech/Outbox.md';
  const declares = edges(snapshot, 'declares').find((edge) => edge.object === id('transactional-outbox'));
  assert.equal(declares.subject, document);
  assert.equal(declares.evidence_unit_id, 'unit:interview-vault:tech/Outbox.md:frontmatter.ontology_concepts[0]');
  const support = edges(snapshot, 'supported_by').find((edge) => edge.subject === id('transactional-outbox'));
  assert.match(support.object, /%ED%95%B4%EA%B2%B0%3A%20Outbox%20%ED%85%8C%EC%9D%B4%EB%B8%94#1$/);
  assert.equal(support.evidence_unit_id, declares.evidence_unit_id);
  assert.ok(has(snapshot, id('transactional-outbox'), 'broader', id('delivery-guarantee')));
  assert.ok(has(snapshot, id('delivery-guarantee'), 'broader', id('messaging-reliability')));
  assert.equal(snapshot.manifest.coverage_gaps.length, 0);
  assert.ok(snapshot.relations.every((edge) => edge.extraction_method === 'parser' && edge.verification === 'source_confirmed'));
});

test('relation endpoints accept canonical IDs, concept shorthand and wikilinks, and evidence adds supported_by', (t) => {
  const { snapshot } = built(t, {
    ...CONCEPT_FILES,
    'tech/Legacy.md': '---\nontology_relations:\n  - {predicate: verified_by, target: "document:interview-vault:tech/Relay.md"}\n'
      + '  - {predicate: verified_by, target: "[[Outbox#문제]]"}\n---\n# Legacy\n',
  });
  const assertion = 'unit:interview-vault:tech/Outbox.md:frontmatter.ontology_relations[0]';
  const addresses = edges(snapshot, 'addresses')[0];
  assert.equal(addresses.subject, id('transactional-outbox'));
  assert.equal(addresses.object, id('dual-write-problem'));
  assert.equal(addresses.evidence_unit_id, assertion);
  const support = edges(snapshot, 'supported_by').find((edge) => edge.subject === assertion);
  assert.equal(support.evidence_unit_id, assertion);
  assert.equal(snapshot.entities.find((entity) => entity.id === support.object).label, '해결: Outbox 테이블');
  const mention = edges(snapshot, 'mentions')[0];
  assert.equal(snapshot.entities.find((entity) => entity.id === mention.subject).label, 'Polling');
  assert.equal(mention.object, id('transactional-outbox'));
  const contradicted = edges(snapshot, 'contradicted_by')[0];
  assert.equal(snapshot.entities.find((entity) => entity.id === contradicted.object).label, '비용');
  const legacy = edges(snapshot, 'verified_by');
  assert.deepEqual(legacy.map((edge) => edge.object).sort(), ['document:interview-vault:tech/Relay.md',
    snapshot.entities.find((entity) => entity.type === 'Section' && entity.source_uri === 'tech/Outbox.md' && entity.label === '문제').id].sort());
  assert.equal(wikilinkTarget(' [[Doc#Heading|label]] '), 'Doc#Heading');
  assert.equal(wikilinkTarget('[[Doc]] and more'), undefined);
  assert.equal(wikilinkTarget('[[ ]]'), undefined);
});

test('every validation violation becomes a coverage gap instead of an edge or entity', (t) => {
  const { snapshot } = built(t, {
    'ontology/vocabulary/Vocabulary-Gaps.md': [
      '---', 'status: vocabulary', 'ontology_concepts:',
      '  - {id: alpha, type: Topic, label: Alpha, broader: beta}',
      '  - {id: beta, type: Topic, label: Beta, broader: alpha}',
      '  - {id: gamma, type: Topic, label: Gamma, aliases: [Shared Name]}',
      '  - {id: delta, type: Topic, label: Delta, aliases: [shared-name]}',
      '  - {id: lonely, type: Topic, label: Lonely, broader: missing-parent}',
      '  - {id: selfish, type: Topic, label: Selfish, broader: selfish}',
      '  - {id: weird, type: Thing, label: Weird}',
      '  - {id: Bad Slug, type: Topic, label: Bad}',
      '  - {id: extra, type: Topic, label: Extra, note: x}',
      '  - {id: kind, type: Category, label: Kind}',
      '  - {id: broken-evidence, type: Topic, label: Broken Evidence, evidence: "[[#Nowhere]]"}',
      '---', '# Gaps vocabulary', '',
    ].join('\n'),
    'tech/Approaches.md': [
      '---', 'tags: [shared name, alpha]', 'category: Undeclared', 'ontology_concepts:',
      '  - {id: fix, type: Approach, label: Fix, evidence: "[[#Fix]]"}',
      '  - {id: other-fix, type: Approach, label: Other Fix, evidence: "[[#Fix]]"}',
      '  - {id: issue, type: Problem, label: Issue, evidence: "[[#Issue]]"}',
      '  - {id: unsupported, type: Approach, label: Unsupported}',
      '  - {id: gamma, type: Topic, label: Gamma Again}',
      'ontology_relations:',
      '  - {subject: "concept:issue", predicate: addresses, target: "concept:fix", evidence: "[[#Fix]]"}',
      '  - {subject: "concept:fix", predicate: addresses, target: "concept:other-fix", evidence: "[[#Fix]]"}',
      '  - {subject: "concept:fix", predicate: alternative_to, target: "concept:fix", evidence: "[[#Fix]]"}',
      '  - {subject: "concept:fix", predicate: addresses, target: "concept:issue"}',
      '  - {subject: "concept:fix", predicate: addresses, target: "concept:issue", evidence: "[[#Missing]]"}',
      '  - {subject: "concept:fix", predicate: declares, target: "concept:issue"}',
      '  - {subject: "concept:fix", predicate: addresses, target: "concept:issue", evidence: "[[#Fix]]", confidence: high}',
      '  - {subject: "concept:fix", predicate: addresses, target: "concept:issue", evidence: 3}',
      '  - {subject: "concept:unsupported", predicate: requires, target: "concept:issue", evidence: "[[#Fix]]"}',
      '  - {subject: "concept:fix", predicate: addresses, target: "concept:issue", evidence: "[[#Fix]]"}',
      '---', '# Approaches', '## Fix', 'The fix body.', '## Issue', 'The issue body.', '',
    ].join('\n'),
  });
  const gaps = snapshot.manifest.coverage_gaps;
  const count = (reason) => gaps.filter((gap) => gap.reason === reason).length;
  assert.deepEqual(Object.fromEntries([...new Set(gaps.map((gap) => gap.reason))].sort().map((reason) => [reason, count(reason)])), {
    InvalidOntologyRelation: 1,
    UnsupportedOntologyPredicate: 1,
    UnverifiedOntologyRelation: 1,
    concept_label_collision: 2,
    domain_violation: 1,
    duplicate_concept_id: 1,
    hierarchy_cycle: 1,
    invalid_concept_declaration: 2,
    missing_evidence: 4,
    range_violation: 1,
    reflexive_relation: 2,
    undeclared_category: 1,
    unresolved_relation: 2,
    unsupported_concept_type: 1,
  });
  const relation = (index) => `unit:interview-vault:tech/Approaches.md:frontmatter.ontology_relations[${index}]`;
  const vocabulary = (index) => `unit:interview-vault:ontology/vocabulary/Vocabulary-Gaps.md:frontmatter.ontology_concepts[${index}]`;
  const gap = (reason, unit) => gaps.find((item) => item.reason === reason && item.evidence_unit_id === unit);
  assert.ok(gap('domain_violation', relation(0)));
  assert.ok(gap('range_violation', relation(1)));
  assert.ok(gap('reflexive_relation', relation(2)));
  assert.ok(gap('missing_evidence', relation(3)));
  assert.match(gap('missing_evidence', relation(4)).message, /unresolved_anchor/);
  assert.ok(gap('unresolved_relation', relation(8)));
  assert.ok(gap('reflexive_relation', vocabulary(5)));
  assert.ok(gap('unresolved_relation', vocabulary(4)));
  assert.ok(gap('missing_evidence', vocabulary(10)));
  assert.ok(gap('duplicate_concept_id', 'unit:interview-vault:tech/Approaches.md:frontmatter.ontology_concepts[4]'));
  assert.ok(gap('missing_evidence', 'unit:interview-vault:tech/Approaches.md:frontmatter.ontology_concepts[3]'));
  assert.deepEqual(gaps.filter((item) => item.reason === 'concept_label_collision').map((item) => item.evidence_unit_id).sort(),
    [vocabulary(2), vocabulary(3)]);
  assert.equal(gaps.find((item) => item.reason === 'undeclared_category').source_uri, 'tech/Approaches.md');

  const concepts = snapshot.entities.filter((entity) => CONCEPT_TYPES.includes(entity.type)).map((entity) => entity.id).sort();
  assert.deepEqual(concepts, ['alpha', 'beta', 'broken-evidence', 'delta', 'fix', 'gamma', 'issue', 'kind', 'lonely',
    'other-fix', 'selfish'].map(id));
  assert.equal(snapshot.entities.find((entity) => entity.id === id('gamma')).source_uri, 'ontology/vocabulary/Vocabulary-Gaps.md');
  assert.equal(edges(snapshot, 'supported_by').some((edge) => edge.subject === id('broken-evidence')), false);
  assert.deepEqual(edges(snapshot, 'addresses').map((edge) => edge.evidence_unit_id), [relation(9)]);
  assert.equal(edges(snapshot, 'alternative_to').length + edges(snapshot, 'requires').length, 0);
  assert.deepEqual(edges(snapshot, 'broader').map((edge) => [edge.subject, edge.object]), [[id('alpha'), id('beta')]],
    'the cycle drops its last edge in (subject, object, source) order, whatever the list positions');
  assert.equal(gaps.find((item) => item.reason === 'hierarchy_cycle').evidence_unit_id, vocabulary(1));
  assert.deepEqual(edges(snapshot, 'tagged_with').map((edge) => edge.object), [id('alpha')], 'a collided tag key maps to nobody');
  assert.equal(edges(snapshot, 'in_category').length, 0);
});

test('a declaration rejected for missing evidence does not claim its slug from a later valid one', (t) => {
  const { snapshot } = built(t, {
    'tech/A.md': '---\nontology_concepts:\n  - {id: shared-problem, type: Problem, label: Shared Problem}\n---\n# A\n',
    'tech/B.md': '---\nontology_concepts:\n  - {id: shared-problem, type: Problem, label: Shared Problem, evidence: "[[#Issue]]"}\n'
      + '---\n# B\n## Issue\nThe issue.\n',
  });
  assert.deepEqual(snapshot.manifest.coverage_gaps.map((gap) => [gap.source_uri, gap.reason]), [['tech/A.md', 'missing_evidence']]);
  assert.equal(snapshot.entities.find((entity) => entity.id === id('shared-problem'))?.source_uri, 'tech/B.md');
});

test('tags and categories map through the label index and counts report coverage', (t) => {
  const { result, snapshot } = built(t, CONCEPT_FILES);
  const tagged = (path) => edges(snapshot, 'tagged_with').filter((edge) => edge.subject === `document:interview-vault:${path}`)
    .map((edge) => edge.object).sort();
  assert.deepEqual(tagged('tech/Outbox.md'), [id('messaging'), id('messaging-reliability')]);
  assert.deepEqual(tagged('tech/Relay.md'), [id('delivery-guarantee')]);
  const root = snapshot.entities.find((entity) => entity.type === 'Section' && entity.source_uri === 'tech/Relay.md'
    && entity.anchor.heading_path.length === 0);
  assert.equal(edges(snapshot, 'tagged_with').find((edge) => edge.subject.endsWith('tech/Relay.md')).evidence_unit_id, root.id);
  assert.deepEqual(edges(snapshot, 'in_category').map((edge) => [edge.subject.split(':').at(-1), edge.object]).sort(), [
    ['ontology/vocabulary/Vocabulary-Messaging.md', id('ontology-category')],
    ['tech/Outbox.md', id('tech-category')],
    ['tech/Relay.md', id('tech-category')],
  ]);
  const { documents, coverage_gaps: gaps, concepts, typed_relations: typed, tags_distinct: distinct, tags_mapped: mapped,
    tags_unmapped: unmapped, categories_unmapped: categories } = result.counts;
  assert.deepEqual([documents, gaps, concepts, typed, distinct, mapped, unmapped, categories], [3, 0, 9, 15, 6, 4, 2, 0]);
  assert.equal(result.counts.units, snapshot.entities.filter((entity) => isA(entity.type, 'EvidenceUnit')).length);
});

test('a repository without Category concepts keeps zero gaps and reports unmapped categories as a metric', (t) => {
  const { result } = built(t, {
    'tech/A.md': '---\ntags: [alpha]\ncategory: Tech\nontology_concepts:\n  - {id: alpha, type: Topic, label: Alpha}\n---\n# A\n',
    'tech/B.md': '---\ncategory: Other\n---\n# B\n',
  });
  assert.equal(result.counts.coverage_gaps, 0);
  assert.equal(result.counts.categories_unmapped, 2);
  assert.equal(result.counts.tags_mapped, 1);
});

test('concept builds are byte-for-byte reproducible across rebuilds and clones', (t) => {
  const fixture = gitFixture(t, CONCEPT_FILES);
  const first = buildSnapshot(fixture);
  const second = buildSnapshot(fixture);
  assert.equal(second.reused, true, 'a second build of the same input matches the stored manifest hash');
  const original = loadSnapshot(fixture);
  const clone = join(fixture.root, 'clone');
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', fixture.repo, clone]);
  const cloned = buildSnapshot({ repo: clone, cacheDir: join(fixture.root, 'clone-cache') });
  const copy = loadSnapshot({ repo: clone, cacheDir: join(fixture.root, 'clone-cache') });
  assert.deepEqual(copy.relations, original.relations);
  assert.deepEqual(copy.entities, original.entities);
  assert.deepEqual(cloned.manifest.artifact_hashes, first.manifest.artifact_hashes);
});

test('concept declarations refuse YAML aliases, wrong shapes and unknown fields at parse time', () => {
  const parse = (yaml) => extractMarkdown({ path: 'tech/X.md', content: `---\n${yaml}\n---\n# X\n`, repoId: 'r', revision: 'v' });
  for (const yaml of [
    'base: &b {id: x, type: Topic, label: X}\nontology_concepts: [*b]',
    'ontology_concepts: {id: x}',
    'ontology_concepts: [x]',
    'ontology_concepts: [{id: x, type: Topic, label: X, aliases: ok}]',
    'ontology_concepts: [{id: x, type: Topic, label: X, evidence: [a]}]',
    'ontology_concepts: [{id: x, type: Topic, label: X, broader: Not A Slug}]',
    'ontology_concepts: [{id: x, type: Topic, label: 3}]',
  ]) {
    const result = parse(yaml);
    assert.deepEqual(result.concepts, [], yaml);
    assert.equal(result.units.some((unit) => unit.type === 'ConceptDeclaration'), false, yaml);
    assert.deepEqual(result.coverage_gaps.map((gap) => gap.type), ['invalid_concept_declaration'], yaml);
  }
  const relation = parse('ontology_relations: [{predicate: mentions, target: x, evidence: "[[#X]]"}]');
  assert.deepEqual(relation.assertions, [{ predicate: 'mentions', target: 'x', evidence: '[[#X]]',
    evidence_unit_id: 'unit:r:tech/X.md:frontmatter.ontology_relations[0]', assertion_occurrence: 1 }]);
  assert.deepEqual(relation.coverage_gaps, []);
});
