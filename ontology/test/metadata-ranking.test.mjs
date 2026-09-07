import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { lookup, search } from '../src/query.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';

function fixture(t, extraFiles = {}) {
  const root = mkdtempSync(join(tmpdir(), 'context-metadata-ranking-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  mkdirSync(join(repo, 'tech'), { recursive: true });
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  writeFileSync(join(repo, 'tech', 'Alpha.md'), '# 설명\n\n고요한 문장의 기록이다.\n');
  writeFileSync(join(repo, 'tech', 'Guide.md'), '# 안내\n\nDocument identifiers support unit tests.\n');
  writeFileSync(join(repo, 'tech', 'Unit-Catalog.md'), '# 목록\n\n이름으로 찾는 자료다.\n');
  for (const [name, content] of Object.entries(extraFiles)) writeFileSync(join(repo, 'tech', name), content);
  git('add', '.');
  git('commit', '-qm', 'fixture');
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { repo, cacheDir, allowlist: ['tech'] };
}

function needleFixture(t, { exactHeading = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'context-metadata-needle-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  mkdirSync(join(repo, 'tech'), { recursive: true });
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
  git('init', '-q');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  const needleBody = exactHeading
    ? ['# Needle', '', 'Needle body links to [[Peer]].']
    : ['# Guide', '', '## Needle explanation', '', 'Needle body links to [[Peer]].'];
  writeFileSync(join(repo, 'tech', 'Needle.md'), [
    '---',
    'aliases: [Needle]',
    `notes: ${'padding '.repeat(500)}`,
    '---',
    ...needleBody,
    '',
  ].join('\n'));
  writeFileSync(join(repo, 'tech', 'Peer.md'), '# Peer\n\nPeer body.\n');
  git('add', '.');
  git('commit', '-qm', 'fixture');
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { repo, cacheDir, allowlist: ['tech'] };
}

test('internal ID prefixes, source IDs and encoded heading bytes do not create lexical matches', (t) => {
  const options = fixture(t);
  const snapshot = loadSnapshot(options);
  for (const query of [snapshot.manifest.source_id, '84', 'A4']) {
    const pack = lookup(options, { query, scope: ['tech'] }, snapshot);
    assert.equal(pack.result_status, 'insufficient_evidence', query);
    assert.deepEqual(pack.evidence_units, [], query);
    assert.deepEqual(pack.entities, [], query);
    const candidates = search(options, { query, scope: ['tech'] }, snapshot);
    assert.deepEqual(candidates.candidates, [], query);
    assert.equal(candidates.pagination.complete, true);
  }
  const documents = search(options, { query: 'document', scope: ['tech'] }, snapshot);
  assert.deepEqual(documents.candidates.map((item) => item.source_uri), ['tech/Guide.md']);
  const units = search(options, { query: 'unit', scope: ['tech'] }, snapshot);
  assert.deepEqual(new Set(units.candidates.map((item) => item.source_uri)),
    new Set(['tech/Guide.md', 'tech/Unit-Catalog.md']));
});

test('literal entity IDs and source paths remain directly searchable', (t) => {
  const options = fixture(t);
  const snapshot = loadSnapshot(options);
  const document = snapshot.entities.find((item) => item.type === 'Document' && item.source_uri === 'tech/Alpha.md');
  const root = snapshot.entities.find((item) => item.type === 'Section'
    && item.source_uri === 'tech/Alpha.md' && !item.anchor.heading_path.length);
  const section = snapshot.entities.find((item) => item.type === 'Section'
    && item.source_uri === 'tech/Alpha.md' && item.anchor.heading_path.at(-1) === '설명');
  assert.ok(document && root && section);
  for (const query of [document.id, root.id, section.id, 'tech/Alpha.md', 'Alpha', '설명']) {
    const result = search(options, { query, scope: ['tech'] }, snapshot);
    assert.equal(result.candidates[0]?.source_uri, 'tech/Alpha.md', query);
    const pack = lookup(options, { query, scope: ['tech'] }, snapshot);
    assert.ok(pack.evidence_units.some((unit) => unit.source_uri === 'tech/Alpha.md'), query);
  }
  const rootPack = lookup(options, { query: root.id, scope: ['tech'] }, snapshot);
  assert.ok(rootPack.evidence_units.some((unit) => unit.id === root.id));
});

test('a high partial metadata score is not reported as an exact match', (t) => {
  const terms = Array.from({ length: 100 }, (_, index) => `token_${index}`);
  const options = fixture(t, { 'Long-Title.md': `# ${terms.join(' ')}\n\n후속 설명.\n` });
  const query = [...terms].reverse().join(' ');
  for (const retrieve of [lookup, search]) {
    const result = retrieve(options, { query, scope: ['tech'], max_bytes: 65536 });
    assert.equal(result.matching.assessment, 'lexical_overlap');
    assert.equal(result.matching.query_term_count, 100);
  }
});

test('an exact document alias selects its explanatory section and retains root provenance', (t) => {
  const options = fixture(t, {
    'Local.md': '---\naliases: [Quartz Model, Source Alias]\n---\n# Local guide\n\n## Quartz explanation\n\nQuartz model has a precise explanatory body. [[Peer]]\n\n## Separate detail\n\nOther text without the requested concept.\n',
    'Peer.md': '# Peer\n\nQuartz appears in a linked overview.\n',
  });
  for (const [query, heading] of [
    ['Quartz Model', 'Quartz explanation'],
    ['Source Alias', 'Local guide'],
    ['Quartz explanation', 'Quartz explanation'],
  ]) {
    const args = { query, scope: ['tech'], max_bytes: 24000 };
    const result = search(options, args);
    assert.equal(result.candidates[0].source_uri, 'tech/Local.md');
    const reference = result.candidates[0].best_evidence_ref;
    assert.equal(reference.anchor.heading_path.at(-1), heading);
    const pack = lookup(options, args);
    assert.ok(pack.evidence_units.some((unit) => unit.id === reference.id));
    assert.ok(pack.evidence_units.some((unit) => !unit.anchor.heading_path.length && unit.excerpt.includes('aliases:')));
    if (query === 'Quartz Model') {
      assert.ok(pack.evidence_units.some((unit) => unit.id === reference.id && unit.excerpt.includes('precise explanatory body')));
    }
  }
});

test('a partial frontmatter alias starts reading from a matching non-root section while lookup retains provenance', (t) => {
  const options = fixture(t, {
    'Hidden.md': '---\naliases: [Hidden Knowledge Term]\n---\n# Hidden guide\n\n## Concrete explanation\n\nKnowledge is explained by this non-root section.\n',
  });
  const args = { query: 'Knowledge', scope: ['tech'], max_bytes: 65536 };
  const result = search(options, args);
  const candidate = result.candidates.find((item) => item.source_uri === 'tech/Hidden.md');
  assert.ok(candidate);
  assert.equal(candidate.best_evidence_ref.anchor.heading_path.at(-1), 'Concrete explanation');

  const pack = lookup(options, args);
  assert.ok(pack.evidence_units.some((unit) => unit.source_uri === 'tech/Hidden.md'
    && !unit.anchor.heading_path.length && unit.excerpt.includes('Hidden Knowledge Term')));
  assert.ok(pack.evidence_units.some((unit) => unit.id === candidate.best_evidence_ref.id
    && unit.excerpt.includes('Knowledge is explained by this non-root section')));
});

test('exact long titles and headings outrank reversed partial metadata competitors before lookup caps roots', (t) => {
  for (const [count, exactKind] of [[100, 'title'], [101, 'heading']]) {
    const terms = Array.from({ length: count }, (_, index) => `term_${index}`);
    const query = terms.join(' ');
    const reversed = [...terms].reverse().join(' ');
    const exactPath = `ExactZ-${count}.md`;
    const exact = exactKind === 'title'
      ? `# ${query}\n\nExact title explanation.\n`
      : `# ExactZ ${count}\n\n## ${query}\n\nExact heading explanation.\n`;
    const noise = Object.fromEntries(Array.from({ length: 7 }, (_, index) => [
      `Noise${String.fromCharCode(65 + index)}-${count}.md`,
      `# ${reversed}\n\nReversed partial metadata competitor ${index}.\n`,
    ]));
    const options = fixture(t, { [exactPath]: exact, ...noise });
    const args = { query, scope: ['tech'], max_bytes: 65536 };
    const searched = search(options, args);
    assert.equal(searched.candidates[0]?.source_uri, `tech/${exactPath}`, `${count} ${exactKind}`);

    const pack = lookup(options, args);
    assert.ok(pack.entities.some((entity) => entity.type === 'Document'
      && entity.label === (exactKind === 'title' ? query : `ExactZ ${count}`)), `${count} ${exactKind}`);
    assert.ok(pack.evidence_units.some((unit) => unit.source_uri === `tech/${exactPath}`), `${count} ${exactKind}`);
  }
});

test('small budgets keep a selected explanatory body ahead of a long exact-alias frontmatter record', (t) => {
  const options = fixture(t, {
    'Budget.md': [
      '---',
      'aliases: [Exact Budget Alias]',
      `notes: ${'frontmatter padding '.repeat(900)}`,
      '---',
      '# Budget guide',
      '',
      '## Selected explanation',
      '',
      'Exact Budget Alias is explained in this short selected body.',
      '',
    ].join('\n'),
  });
  const args = { query: 'Exact Budget Alias', scope: ['tech'] };
  const selected = 'Selected explanation';
  let successful = 0;
  for (const max_bytes of [2400, 2800, 3200, 4000]) {
    try {
      const result = lookup(options, { ...args, max_bytes });
      successful += 1;
      assert.ok(result.evidence_units.some((unit) => unit.source_uri === 'tech/Budget.md'
        && unit.anchor.heading_path.at(-1) === selected
        && unit.excerpt.includes('short selected body')), `budget ${max_bytes}`);
    } catch (error) {
      if (error?.code !== 'budget_too_small') throw error;
    }
  }
  assert.ok(successful >= 1);

  const complete = lookup(options, { ...args, max_bytes: 65536 });
  assert.ok(complete.evidence_units.some((unit) => unit.source_uri === 'tech/Budget.md'
    && !unit.anchor.heading_path.length && unit.excerpt.includes('frontmatter padding')));
  assert.ok(complete.evidence_units.some((unit) => unit.source_uri === 'tech/Budget.md'
    && unit.anchor.heading_path.at(-1) === selected
    && unit.excerpt.includes('short selected body')));
});

test('an exact one-token alias prefers a body-matching H2 over inherited alias metadata', (t) => {
  const options = needleFixture(t);
  const result = search(options, { query: 'Needle', scope: ['tech'], max_bytes: 65536 });
  const candidate = result.candidates.find((item) => item.source_uri === 'tech/Needle.md');
  assert.ok(candidate);
  assert.equal(candidate.best_evidence_ref.anchor.heading_path.at(-1), 'Needle explanation');
});

test('omitting optional root provenance leaves an already fitting graph bundle intact', (t) => {
  const options = needleFixture(t, { exactHeading: true });
  // This isolated two-document fixture places the relation bundle below the
  // optional root provenance. The pre-fix packer dropped the relation at 2440.
  const bounded = lookup(options, { query: 'Needle', scope: ['tech'], depth: 1, max_bytes: 2440 });
  assert.equal(bounded.budget.exhausted, true);
  assert.ok(!bounded.evidence_units.some((unit) => unit.source_uri === 'tech/Needle.md'
    && !unit.anchor.heading_path.length));
  assert.ok(bounded.relations.length > 0);
  const ids = new Set(bounded.entities.map((entity) => entity.id));
  const evidence = new Set(bounded.evidence_units.map((unit) => unit.id));
  for (const relation of bounded.relations) {
    assert.equal(relation.predicate, 'links_to');
    assert.ok(ids.has(relation.subject));
    assert.ok(ids.has(relation.object));
    assert.ok(evidence.has(relation.evidence_unit_id));
  }
  assert.ok(bounded.evidence_units.some((unit) => unit.anchor.heading_path.at(-1) === 'Needle'));
});

test('a bounded partial response keeps fitting direct evidence when its limit gap cannot fit', (t) => {
  const options = fixture(t, {
    'Reference.md': '# Framework\n\n## Development Knowledge Ontology\n\nDevelopment Knowledge Ontology is the selected non-root evidence.\n',
  });
  const result = lookup(options, {
    query: 'Development Knowledge Ontology', scope: ['tech'], max_bytes: 1976,
  });
  assert.equal(result.result_status, 'partial');
  assert.equal(result.budget.exhausted, true);
  assert.ok(!result.coverage_gaps.some((gap) => gap.reason === 'output_limit_reached'));
  assert.ok(result.evidence_units.some((unit) => unit.source_uri === 'tech/Reference.md'
    && unit.anchor.heading_path.at(-1) === 'Development Knowledge Ontology'
    && unit.excerpt.includes('selected non-root')));
});

test('an exact alias records a body-only single-token match in section diagnostics', (t) => {
  const options = fixture(t, {
    'General.md': '---\naliases: [Signal]\n---\n# Guide\n\n## Explanation\n\nSignal appears only in this selected body.\n',
  });
  const result = lookup(options, { query: 'Signal', scope: ['tech'], max_bytes: 65536 });
  assert.equal(result.matching.assessment, 'exact_metadata');
  assert.equal(result.matching.max_section_term_matches, 1);
  assert.ok(result.evidence_units.some((unit) => unit.source_uri === 'tech/General.md'
    && unit.anchor.heading_path.at(-1) === 'Explanation'
    && unit.excerpt.includes('Signal appears only in this selected body')));
});

test('bounded coverage-gap summaries retain hidden counts across exhausted lookup and search pages', (t) => {
  const options = fixture(t, Object.fromEntries(Array.from({ length: 22 }, (_, index) => [
    `Needle-${String(index).padStart(2, '0')}.md`, `# Needle ${index}\n\nNeedle evidence ${index}.\n`,
  ])));
  const snapshot = loadSnapshot(options);
  snapshot.manifest.coverage_gaps = Array.from({ length: 12 }, (_, index) => ({
    source_uri: 'tech/Needle-00.md', reason: 'unresolved_link', unresolved_target: `Missing-${index}`,
  }));
  const assertGapSummary = (result) => {
    const summaries = result.coverage_gaps.filter((gap) => gap.reason === 'coverage_gaps_omitted');
    const visible = result.coverage_gaps.filter((gap) => gap.reason !== 'coverage_gaps_omitted');
    assert.equal(summaries.length, 1);
    assert.ok(summaries[0].total_matching >= 12);
    assert.equal(summaries[0].returned, visible.length);
    assert.ok(visible.length <= 8);
  };

  const lookupResult = lookup(options, { query: 'Needle', scope: ['tech'], max_bytes: 4000 }, snapshot);
  assert.equal(lookupResult.budget.exhausted, true);
  assertGapSummary(lookupResult);

  const first = search(options, { query: 'Needle', scope: ['tech'], max_bytes: 65536 }, snapshot);
  assert.equal(first.pagination.returned_documents, 20);
  assert.ok(first.pagination.next_cursor);
  assertGapSummary(first);
  const second = search(options, {
    query: 'Needle', scope: ['tech'], cursor: first.pagination.next_cursor, max_bytes: 65536,
  }, snapshot);
  assert.equal(second.pagination.complete, true);
  assertGapSummary(second);
});
