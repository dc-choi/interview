import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { extractMarkdown, normalizeHeading } from '../src/markdown.mjs';

const base = { path: 'tech/Example.md', repoId: 'interview', revision: 'abc123', updatedAt: '2026-09-05T00:00:00Z' };

function extract(markdown) {
  return extractMarkdown({ ...base, content: Buffer.from(markdown) });
}

test('extracts metadata, sections, links, and UTF-8 byte anchors', () => {
  const markdown = `---\naliases: [예시]\ntags: [node, 검색]\ncategory: tech\nstatus: done\ntype: Note\n---\n소개 [[Target|별칭]].\n# 첫 번째\n한글 [[Target]]\n## 하위 *제목* [링크](https://example.com)\n본문\n# 첫 번째\n끝\n`;
  const result = extract(markdown);
  assert.deepEqual(result.document.aliases, ['예시']);
  assert.equal(result.document.label, '첫 번째');
  assert.deepEqual(result.document.tags, ['node', '검색']);
  assert.equal(result.document.category, 'tech');
  assert.equal(result.document.status, 'done');
  assert.deepEqual(result.units.filter((unit) => unit.type === 'Section').map((unit) => unit.anchor.heading_path), [
    [],
    ['첫 번째'],
    ['첫 번째', '하위 제목 링크'],
    ['첫 번째'],
  ]);
  assert.equal(result.units[1].anchor.start_byte, Buffer.byteLength(markdown.slice(0, markdown.indexOf('# 첫 번째'))));
  assert.equal(result.units[2].anchor.end_byte, result.units[3].anchor.start_byte);
  assert.deepEqual(result.links, [
    { target: 'Target', evidence_unit_id: result.units[0].id, assertion_occurrence: 1 },
    { target: 'Target', evidence_unit_id: result.units[1].id, assertion_occurrence: 1 },
  ]);
  assert.equal(result.units[1].content_hash, `sha256:${createHash('sha256').update(Buffer.from(markdown).subarray(result.units[1].anchor.start_byte, result.units[1].anchor.end_byte)).digest('hex')}`);
});

test('recognizes setext headings and ignores code and comments', () => {
  const markdown = `prelude\n=======\n\`# inline [[Nope]]\`\n\`\`\`md\n# fenced [[Nope]]\n\`\`\`\n<!-- # comment [[Nope]] -->\n본문 [[Yep]]\n`;
  const result = extract(markdown);
  assert.equal(result.units.length, 2);
  assert.equal(result.units[1].label, 'prelude');
  assert.deepEqual(result.links, [{ target: 'Yep', evidence_unit_id: result.units[1].id, assertion_occurrence: 1 }]);
  assert.equal(normalizeHeading('**제목** [링크](https://example.com)'), '제목 링크');
  assert.equal(normalizeHeading('2. 멱등 키 + 상태 저장소'), '2. 멱등 키 + 상태 저장소');
});

test('keeps wikilinks that cross inline code and excludes standalone inline code', () => {
  const result = extract('# Title\n[[Event `v1`]] [[Second]] [[Event `v1`]] `[[Nope]]`\n');
  assert.deepEqual(result.links, [
    { target: 'Event `v1`', evidence_unit_id: result.units[1].id, assertion_occurrence: 1 },
    { target: 'Second', evidence_unit_id: result.units[1].id, assertion_occurrence: 2 },
    { target: 'Event `v1`', evidence_unit_id: result.units[1].id, assertion_occurrence: 3 },
  ]);
});

test('encodes heading components in IDs without changing anchors', () => {
  const result = extract('# A/B\n# A\n## B\n');
  assert.notEqual(result.units[1].id, result.units[3].id);
  assert.equal(result.units[1].id, 'unit:interview:tech/Example.md:A%2FB#1');
  assert.deepEqual(result.units[1].anchor.heading_path, ['A/B']);
});

test('keeps candidate relations out of serving assertion units and edges', () => {
  const markdown = `---\nontology_relations:\n  - subject: '[[Order]]'\n    predicate: emits\n    target: '[[Event]]'\n    verification: candidate\n---\n# Body\n`;
  const result = extract(markdown);
  assert.deepEqual(result.assertions, []);
  assert.equal(result.units.some((item) => item.type === 'RelationAssertion'), false);
  assert.ok(result.coverage_gaps.some((gap) => gap.type === 'UnverifiedOntologyRelation'));
});

test('keeps only complete, schema-approved relation assertions', () => {
  const result = extract(`---\nontology_relations:\n  - predicate: publishes\n    target: Event\n  - subject: 1\n    predicate: publishes\n    target: Event\n  - predicate: ''\n    target: Event\n  - predicate: contains\n    target: Event\n  - predicate: links_to\n    target: Event\n---\n`);
  assert.equal(result.assertions.length, 1);
  assert.equal(result.units.filter((item) => item.type === 'RelationAssertion').length, 1);
  assert.deepEqual(result.assertions[0], {
    predicate: 'publishes',
    target: 'Event',
    evidence_unit_id: 'unit:interview:tech/Example.md:frontmatter.ontology_relations[0]',
    assertion_occurrence: 1,
  });
  assert.ok(result.coverage_gaps.some((gap) => gap.message.includes('.subject must be a string')));
  assert.ok(result.coverage_gaps.some((gap) => gap.message.includes('requires non-empty predicate and target')));
  assert.equal(result.coverage_gaps.filter((gap) => gap.type === 'UnsupportedOntologyPredicate').length, 2);
});

test('reports malformed YAML and invalid metadata fields as coverage gaps', () => {
  const malformed = extract('---\ntags: [broken\n---\n# Body\n');
  assert.ok(malformed.coverage_gaps.some((gap) => gap.type === 'MalformedFrontmatter'));
  const invalid = extract('---\naliases: alias\ntags: node\ntype: [bad]\n---\n# Body\n');
  assert.deepEqual(invalid.document.aliases, []);
  assert.deepEqual(invalid.document.tags, []);
  assert.equal(invalid.coverage_gaps.filter((gap) => gap.type === 'InvalidFrontmatterField').length, 3);
});

test('creates a searchable root section for frontmatter-only documents', () => {
  const markdown = '---\ntags: [context]\n---\n';
  const result = extract(markdown);
  assert.equal(result.units.length, 1);
  assert.deepEqual(result.units[0].anchor, {
    heading_path: [],
    occurrence: 1,
    start_line: 1,
    end_line: 3,
    start_byte: 0,
    end_byte: Buffer.byteLength(markdown),
  });
});

test('rejects invalid UTF-8 instead of publishing shifted byte anchors', () => {
  assert.throws(() => extractMarkdown({ ...base, content: Buffer.from([35, 32, 255, 10, 35, 32, 66, 10]) }),
    { code: 'invalid_source_encoding' });
});

test('escaped wikilink literals do not become source-confirmed links', () => {
  const result = extract(String.raw`# Links
\[[Literal]] \\[[Real]] \\\[[AlsoLiteral]] [[Another]]
`);
  assert.deepEqual(result.links.map((link) => link.target), ['Real', 'Another']);
});

test('URLs, image paths, link definitions and multiline literals are not wiki links', () => {
  const result = extract('# Links\n[label](https://x/[[B]])\n![alt](assets/[[B]].png)\n<https://x/[[B]]>\n\n[ref]: https://x/[[B]]\n\n[[B\n]]\n[[Real]]\n');
  assert.deepEqual(result.links.map((link) => link.target), ['Real']);
});

test('line anchors count LF, CRLF and bare CR consistently', () => {
  for (const newline of ['\n', '\r\n', '\r']) {
    const result = extract(['# A', 'body', '# B', 'tail'].join(newline));
    const section = result.units.find((unit) => unit.label === 'B');
    assert.equal(section.anchor.start_line, 3);
    assert.equal(section.anchor.end_line, 4);
  }
});

test('empty headings have distinct IDs from root and literal percent headings', () => {
  const result = extract('#\nbody\n# %\n');
  assert.equal(new Set(result.units.map((unit) => unit.id)).size, result.units.length);
  assert.deepEqual(result.units[1].anchor.heading_path, ['']);
});

test('YAML aliases cannot create claims whose anchor omits their predicate and target', () => {
  for (const yaml of [
    'rel: &approved {predicate: verified_by, target: example}\nontology_relations: [*approved]',
    'target: &target example\nontology_relations: [{predicate: verified_by, target: *target}]',
  ]) {
    const result = extract(`---\n${yaml}\n---\n# Body\n`);
    assert.equal(result.assertions.length, 0);
    assert.equal(result.units.some((unit) => unit.type === 'RelationAssertion'), false);
    assert.equal(result.coverage_gaps.some((gap) => gap.type === 'UnsupportedOntologyAlias'), true);
  }
});

test('table cells escape the alias pipe without corrupting the link target', () => {
  const result = extract('# Links\n| 도메인 | 설명 |\n|---|---|\n| [[Commerce-Pricing\\|가격 도메인]] | 가격 |\n[[Plain\\|별칭]] [[Heading#Sub\\|별칭]]\n');
  assert.deepEqual(result.links.map((link) => link.target), ['Commerce-Pricing', 'Plain', 'Heading#Sub']);
});

test('keeps verified_at as a string and reports other shapes as coverage gaps', () => {
  const dated = extract('---\nverified_at: 2026-09-05\n---\n# Body\n');
  assert.equal(dated.document.verified_at, '2026-09-05');
  const absent = extract('# Body\n');
  assert.equal(absent.document.verified_at, null);
  const invalid = extract('---\nverified_at: [2026-09-05]\n---\n# Body\n');
  assert.equal(invalid.document.verified_at, null);
  assert.equal(invalid.coverage_gaps.filter((gap) => gap.type === 'InvalidFrontmatterField').length, 1);
});

test('classifies only explicit navigation wikilinks', () => {
  const indexed = extract(`---
status: index
---
# Index
상위: [[Parent]]. 구현: [[Implementation]]
[[Other]] 설명 뒤 상위: [[InlineParent]]
> 상위: [[Quoted]]
~~~md
상위: [[Code]]
~~~

## 목차
- [[Member]]
- [[#Index]]

## 목차 (메시징 인프라 — 어떻게 안전하게 전송)
- [[DescribedMember]]

## 하위 영역
- [[Area]]

## 하위 폴더 인덱스 (6개)
- [[Folder]]

## 하위 문서
- [[Child]]

## 관련 문서
- [[Related]]

## 목차 안내
- [[NotMember]]
`);
  assert.deepEqual(indexed.links.map((link) => [link.target, link.link_role]), [
    ['Parent', 'parent_index'],
    ['Implementation', undefined],
    ['Other', undefined],
    ['InlineParent', 'parent_index'],
    ['Quoted', 'parent_index'],
    ['Member', 'index_member'],
    ['#Index', undefined],
    ['DescribedMember', 'index_member'],
    ['Area', 'index_member'],
    ['Folder', 'index_member'],
    ['Child', 'index_member'],
    ['Related', 'related_document'],
    ['NotMember', undefined],
  ]);
  assert.equal(indexed.links.some((link) => link.target === 'Code'), false);

  const ordinary = extract(`---
status: done
---
## 관련문서
[[RelatedWithoutIndex]]
## 목차
[[NotAnIndexMember]]
`);
  assert.deepEqual(ordinary.links.map((link) => [link.target, link.link_role]), [
    ['RelatedWithoutIndex', 'related_document'],
    ['NotAnIndexMember', undefined],
  ]);

  const quotedHeading = extract(`---
status: index
---
> ## 관련 문서
> [[Quoted]]

[[Outside]]
`);
  assert.deepEqual(quotedHeading.links.map((link) => [link.target, link.link_role]), [
    ['Quoted', undefined],
    ['Outside', undefined],
  ]);

  const bareCr = extract('# Index\r상위:\r[[AcrossLine]]\r상위: [[SameLine]]\r');
  assert.deepEqual(bareCr.links.map((link) => [link.target, link.link_role]), [
    ['AcrossLine', undefined],
    ['SameLine', 'parent_index'],
  ]);
});
