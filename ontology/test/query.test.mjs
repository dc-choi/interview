import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { ContextError } from '../src/core.mjs';
import { lookup, search } from '../src/query.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
}

async function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'context-query-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  execFileSync('mkdir', ['-p', join(repo, 'tech')]);
  git(root, ['init', '-q', repo]);
  git(repo, ['config', 'user.name', 'Test User']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  writeFileSync(join(repo, 'tech', 'event.md'), [
    '---',
    'aliases: [이벤트 발행]',
    'tags: [messaging]',
    'verified_at: 2026-09-01',
    '---',
    '# 이벤트 발행',
    '',
    '## 재시도',
    '',
    '발행 실패는 재시도와 멱등성 검토가 필요하다. [[Target#소비자]]',
    '',
  ].join('\n'));
  writeFileSync(join(repo, 'tech', 'target.md'), '# Target\n\n## 소비자\n\n소비자는 이벤트 계약을 확인한다.\n');
  git(repo, ['add', 'tech']);
  git(repo, ['commit', '-qm', 'fixture']);
  await buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { repo, cacheDir };
}

async function fixtureWithFiles(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'context-query-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  git(root, ['init', '-q', repo]);
  git(repo, ['config', 'user.name', 'Test User']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  for (const [sourcePath, content] of files) {
    mkdirSync(dirname(join(repo, sourcePath)), { recursive: true });
    writeFileSync(join(repo, sourcePath), content);
  }
  git(repo, ['add', '.']);
  git(repo, ['commit', '-qm', 'fixture']);
  await buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { repo, cacheDir };
}

test('lookup returns exact alias, source-backed sections, and an outgoing relation', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: '이벤트 발행', scope: ['tech'], depth: 1, max_bytes: 65536,
  });

  assert.equal(result.result_status, 'ok');
  assert.equal(result.index_sync[0].status, 'synced');
  assert.equal(result.entities.find((entity) => entity.label === '이벤트 발행').verified_at, '2026-09-01');
  assert.ok(result.entities.some((entity) => entity.label === 'Target'));
  assert.equal(result.relations.length, 1);
  assert.equal(result.relations[0].predicate, 'links_to');
  assert.ok(result.entities.some((entity) => entity.type === 'Section' && entity.label === '소비자'));
  assert.ok(result.evidence_units.some((unit) => unit.excerpt.includes('재시도')));
  assert.ok(Buffer.byteLength(JSON.stringify(result), 'utf8') <= 65536);
  assert.equal(Buffer.byteLength(JSON.stringify(result), 'utf8'), result.budget.used_bytes);
  const provenance = result.evidence_units.find((unit) => unit.anchor.heading_path.length === 0);
  assert.ok(provenance, 'exact alias results include the frontmatter/root provenance unit');
  assert.ok(provenance.excerpt.includes('aliases: [이벤트 발행]'));
});

test('lookup rejects blank queries instead of matching empty root metadata', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  for (const query of ['', ' ', '\t\n', '\u3000', '\u00a0']) {
    assert.throws(() => lookup(options, { query }),
      (error) => error instanceof ContextError && error.code === 'invalid_query');
  }
  const result = lookup(options, { query: '  이벤트 발행  ' });
  assert.equal(result.matching.assessment, 'exact_metadata');
  assert.ok(result.evidence_units.length > 0);
});

test('a matching section seeds incoming graph edges with its owning document', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: '소비자', scope: ['tech'], depth: 1, max_bytes: 65536,
  });

  assert.ok(result.entities.some((entity) => entity.label === 'Target'));
  assert.ok(result.entities.some((entity) => entity.type === 'Section' && entity.label === '소비자'));
  assert.ok(result.entities.some((entity) => entity.label === '이벤트 발행'));
  assert.ok(result.relations.some((relation) => relation.predicate === 'links_to'
    && relation.object.includes('%EC%86%8C%EB%B9%84%EC%9E%90')));
});

test('lookup excludes generic-token documents when a query has a more discriminative term', async (t) => {
  const generic = Array.from({ length: 7 }, (_, index) => [
    `tech/Pattern-${index}.md`,
    `# Pattern ${index}\n\nThis pattern is useful in a generic product discussion.\n`,
  ]);
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Transactional-Outbox.md', '---\naliases: [outbox pattern]\n---\n# Transactional Outbox\n\nThe outbox pattern records an event in the same transaction.\n'],
    ...generic,
  ]);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'outbox pattern', scope: ['tech'], max_bytes: 65536,
  });

  assert.ok(result.evidence_units.length > 0);
  assert.ok(result.evidence_units.every((unit) => unit.source_uri === 'tech/Transactional-Outbox.md'));
  assert.ok(result.entities.some((entity) => entity.label === 'Transactional Outbox'));
  assert.ok(result.entities.every((entity) => !entity.label.startsWith('Pattern ')));
});

test('lookup keeps body-relevant documents for a long multi-condition query', async (t) => {
  const common = Array.from({ length: 6 }, (_, index) => [
    `tech/Retry-${index}.md`,
    `# Retry ${index}\n\nA retry handles a generic failure.\n`,
  ]);
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/A-Related.md', '# Related Delivery\n\nA retry queue preserves delivery work after a failure.\n'],
    ...common,
    ['tech/Alert-Only.md', '# Alert\n\nAn alert reports an unrelated condition.\n'],
  ]);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'retry queue alert workflow', scope: ['tech'], max_bytes: 65536,
  });

  assert.ok(result.evidence_units.some((unit) => unit.source_uri === 'tech/A-Related.md'));
});

test('concise matching evidence survives competition from long general notes', async (t) => {
  const longNotes = Array.from({ length: 6 }, (_, index) => [
    `tech/A-Notes-${index}.md`,
    `# Notes ${index}\n\nThe archive mentions retry queue delivery.\n\n${'Unrelated historical observations. '.repeat(400)}\n`,
  ]);
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ...longNotes,
    ['tech/Z-Resolution.md', '# Resolution\n\nA retry queue preserves delivery after a failure.\n'],
  ]);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'retry queue delivery workflow', scope: ['tech'], max_bytes: 24000,
  });
  assert.ok(result.evidence_units.some((unit) => unit.source_uri === 'tech/Z-Resolution.md'
    && unit.excerpt.includes('preserves delivery after a failure')));
});

test('long questions expose weak overlap without claiming semantic relevance or knowledge absence', async (t) => {
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Settings.md', '# Settings\n\nCalibration changes the local instrument settings. Calibration can be repeated.\n'],
  ]);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const result = lookup(options, {
    query: 'crystalline compass moonlight garden fairy concentration drift adjustment calibration procedure',
    scope: ['tech'], max_bytes: 24000,
  });
  assert.equal(result.matching.assessment, 'weak_lexical_overlap');
  assert.equal(result.matching.query_term_count, 10);
  assert.equal(result.matching.max_section_term_matches, 1);
  assert.ok(result.evidence_units.length > 0);
  assert.equal(lookup(options, { query: 'Settings' }).matching.assessment, 'exact_metadata');
  assert.equal(lookup(options, { query: 'qzxvnmprtjwfkblsyh' }).matching.assessment, 'no_lexical_overlap');
});

test('a 24KB response keeps each returned graph edge with endpoints and evidence', async (t) => {
  const longAlias = 'a'.repeat(900);
  const noisyRoots = Array.from({ length: 6 }, (_, index) => [
    `tech/Outbox-${index}.md`,
    `---\naliases: [${longAlias}, outbox, pattern]\ntags: [outbox, pattern]\n---\n# Outbox ${index}\n\noutbox pattern${index === 0 ? ' [[Consumer]]' : ''} ${'x'.repeat(3000)}\n`,
  ]);
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ...noisyRoots,
    ['tech/Consumer.md', '# Consumer\n\nConsumes a committed event.\n'],
  ]);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'outbox pattern', scope: ['tech'], depth: 1, max_bytes: 24 * 1024,
  });

  assert.ok(result.relations.length > 0);
  const entities = new Set(result.entities.map((entity) => entity.id));
  const evidence = new Set(result.evidence_units.map((unit) => unit.id));
  for (const relation of result.relations) {
    assert.ok(entities.has(relation.subject));
    assert.ok(entities.has(relation.object));
    assert.ok(evidence.has(relation.evidence_unit_id));
  }
  assert.ok(result.evidence_units.some((unit) => unit.excerpt.includes('[[Consumer]]')));
  const serialized = Buffer.byteLength(JSON.stringify(result), 'utf8');
  assert.equal(serialized, result.budget.used_bytes);
  assert.ok(serialized <= 24 * 1024);
});

test('budget trimming keeps only complete direct and graph evidence bundles', async (t) => {
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Needle.md', '---\naliases: [Needle]\n---\n# Needle\n\nDirect evidence. [[Link-Alpha]] [[Link-Beta]]\n'],
    ['tech/Link-Alpha.md', '# Link Alpha\n\n[[Alpha]]\n'],
    ['tech/Link-Beta.md', '# Link Beta\n\n[[Beta]]\n'],
    ['tech/Alpha.md', '# Alpha\n\nTarget Alpha.\n'],
    ['tech/Beta.md', '# Beta\n\nTarget Beta.\n'],
  ]);
  const snapshot = loadSnapshot({ repo, cacheDir });
  const needle = snapshot.entities.find((entity) => entity.type === 'Document' && entity.source_uri === 'tech/Needle.md');
  assert.ok(needle);
  const linkedDocuments = new Set(snapshot.entities
    .filter((entity) => entity.type === 'Document' && ['tech/Link-Alpha.md', 'tech/Link-Beta.md'].includes(entity.source_uri))
    .map((entity) => entity.id));
  assert.equal(linkedDocuments.size, 2);
  assert.equal(snapshot.relations.filter((relation) => relation.subject === needle.id
    && relation.predicate === 'links_to' && linkedDocuments.has(relation.object)).length, 2);
  const snapshotEntities = new Map(snapshot.entities.map((entity) => [entity.id, entity]));
  const documentsByPath = new Map(snapshot.entities
    .filter((entity) => entity.type === 'Document')
    .map((entity) => [entity.source_uri, entity.id]));
  const directEvidence = new Set(snapshot.entities
    .filter((entity) => entity.type === 'Section' && entity.source_uri === 'tech/Needle.md')
    .map((entity) => entity.id));
  let successfulBudgets = 0;
  let limitedBudgets = 0;
  for (const maxBytes of [1800, 2200, 2800, 3400, 4200]) {
    let result;
    try {
      result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
        query: 'Needle', scope: ['tech'], depth: 2, max_bytes: maxBytes,
      });
    } catch (error) {
      assert.ok(error instanceof ContextError && error.code === 'budget_too_small');
      continue;
    }
    successfulBudgets += 1;
    if (result.budget.exhausted) limitedBudgets += 1;
    const entities = new Set(result.entities.map((entity) => entity.id));
    const relationEvidence = new Set(result.relations.map((relation) => relation.evidence_unit_id));
    for (const relation of result.relations) {
      assert.ok(entities.has(relation.subject));
      assert.ok(entities.has(relation.object));
      for (const endpoint of [relation.subject, relation.object]) {
        const entity = snapshotEntities.get(endpoint);
        const owner = entity.type === 'Document' ? entity.id : documentsByPath.get(entity.source_uri);
        assert.ok(entities.has(owner));
      }
    }
    for (const unit of result.evidence_units) {
      assert.ok(directEvidence.has(unit.id) || relationEvidence.has(unit.id), unit.id);
      if (directEvidence.has(unit.id)) assert.ok(entities.has(needle.id));
    }
    const serialized = Buffer.byteLength(JSON.stringify(result), 'utf8');
    assert.equal(serialized, result.budget.used_bytes);
    assert.ok(serialized <= maxBytes);
  }
  assert.ok(successfulBudgets >= 2);
  assert.ok(limitedBudgets >= 1);
});

test('lookup rejects unknown arguments and serves only pinned evidence from a dirty worktree', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  assert.throws(
    () => lookup({ repo, cacheDir, allowlist: ['tech'] }, { query: 'event', unexpected: true }),
    (error) => error instanceof ContextError && error.code === 'invalid_arguments',
  );

  writeFileSync(join(repo, 'uncommitted.md'), '# changed\n\n이벤트 발행이라는 새 문장은 색인에 없다.\n');
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, { query: '이벤트 발행' });
  assert.equal(result.index_sync[0].status, 'unindexed_worktree');
  assert.ok(result.evidence_units.length > 0);
  assert.ok(result.evidence_units.every((unit) => unit.source_uri !== 'uncommitted.md'));
  assert.ok(result.index_sync[0].errors.includes('unindexed_worktree'));

  git(repo, ['add', 'uncommitted.md']);
  git(repo, ['commit', '-qm', 'new unindexed revision']);
  const mismatch = lookup({ repo, cacheDir, allowlist: ['tech'] }, { query: '이벤트 발행' });
  assert.equal(mismatch.index_sync[0].status, 'revision_mismatch');
  assert.ok(mismatch.evidence_units.every((unit) => unit.source_uri !== 'uncommitted.md'));
});

test('lookup can finish from a pinned snapshot after another build replaces the active one', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  const pinned = loadSnapshot({ repo, cacheDir });
  writeFileSync(join(repo, 'tech', 'event.md'), '# Replacement\n\nold evidence removed\n');
  git(repo, ['add', 'tech/event.md']);
  git(repo, ['commit', '-qm', 'replace active snapshot']);
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });

  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: '이벤트 발행', scope: ['tech'], max_bytes: 65536,
  }, pinned);
  assert.equal(result.index_sync[0].revision, pinned.manifest.revision);
  assert.equal(result.index_sync[0].status, 'revision_mismatch');
  assert.ok(result.evidence_units.some((unit) => unit.excerpt.includes('aliases: [이벤트 발행]')));
});

test('lookup rejects a budget that cannot carry required metadata', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  assert.throws(
    () => lookup({ repo, cacheDir, allowlist: ['tech'] }, { query: '이벤트 발행', max_bytes: 1 }),
    (error) => error instanceof ContextError && error.code === 'budget_too_small',
  );
});

test('lookup reports a fixed-point used_bytes value within the serialized output budget', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  const full = lookup({ repo, cacheDir, allowlist: ['tech'] }, { query: '이벤트 발행', max_bytes: 65536 });
  const bounded = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: '이벤트 발행', max_bytes: full.budget.used_bytes,
  });
  const serialized = Buffer.byteLength(JSON.stringify(bounded), 'utf8');
  assert.equal(serialized, bounded.budget.used_bytes);
  assert.ok(serialized <= bounded.budget.effective_max_bytes);
});

test('lookup counts escaped Unicode JSON across four and five digit response sizes', async (t) => {
  const content = '# Escaped\n\n' + '한😀 "quote" \\ tail\n'.repeat(700);
  const { repo, cacheDir } = await fixtureWithFiles(t, [['tech/Escaped.md', content]]);
  const sizes = [];
  for (const max_bytes of [9999, 10000, 10001, 65536]) {
    const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, { query: 'Escaped', max_bytes });
    const bytes = Buffer.byteLength(JSON.stringify(result));
    assert.equal(bytes, result.budget.used_bytes);
    assert.ok(bytes <= max_bytes);
    sizes.push(bytes);
    if (max_bytes === 65536) assert.equal(result.evidence_units[0].excerpt, content);
  }
  assert.ok(Math.min(...sizes) < 10000 && Math.max(...sizes) >= 10000);
});

test('larger output budgets never turn a successful direct result into a failure', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  let firstSuccess;
  for (const maxBytes of [4000, 4500, 5000, 5500, 6500, 8000, 12000]) {
    try {
      const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
        query: '이벤트 발행', max_bytes: maxBytes,
      });
      firstSuccess ??= maxBytes;
      assert.ok(firstSuccess, `expected a successful result at ${maxBytes}`);
      assert.ok(result.evidence_units.length > 0);
      assert.equal(Buffer.byteLength(JSON.stringify(result), 'utf8'), result.budget.used_bytes);
      assert.ok(result.budget.used_bytes <= maxBytes);
    } catch (error) {
      if (firstSuccess) throw error;
      assert.ok(error instanceof ContextError && error.code === 'budget_too_small');
    }
  }
});

test('lookup keeps the allowlist, indexed paths, and requested scope intersected', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  const blocked = lookup({ repo, cacheDir, allowlist: ['fit'] }, {
    query: '이벤트 발행', scope: ['tech'],
  });
  assert.equal(blocked.evidence_units.length, 0);
  assert.equal(blocked.index_sync[0].requested_scope_indexed, false);

  const root = lookup({ repo, cacheDir, allowlist: ['.'] }, {
    query: '이벤트 발행', scope: ['.'],
  });
  assert.equal(root.result_status, 'ok');
  assert.ok(root.evidence_units.every((unit) => unit.source_uri.startsWith('tech/')));
});

test('body retrieval ignores Git replace refs and reads the snapshot revision', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  const revision = git(repo, ['rev-parse', 'HEAD']).trim();
  writeFileSync(join(repo, 'tech', 'event.md'), '# 대체 이벤트\n\n대체 본문은 원래 재시도 근거를 지운다.\n');
  git(repo, ['add', 'tech/event.md']);
  git(repo, ['commit', '-qm', 'replacement']);
  const replacement = git(repo, ['rev-parse', 'HEAD']).trim();
  git(repo, ['replace', revision, replacement]);
  git(repo, ['update-ref', 'HEAD', revision]);

  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: '멱등성', scope: ['tech'], depth: 1, max_bytes: 65536,
  });

  assert.ok(result.evidence_units.some((unit) => unit.excerpt.includes('멱등성 검토')));
  assert.ok(result.evidence_units.every((unit) => !unit.excerpt.includes('대체 본문')));
});

test('lookup keeps a matching sibling condition and completes selected sections when budget permits', async (t) => {
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Guide.md', [
      '# Transport guide', '',
      '## Recovery', '',
      'A retry needs a deadline. Retry work must respect the deadline. [[Peer]]',
      '배경 설명입니다. '.repeat(200),
      'Cancel pending work when the deadline expires.', '',
      '## Identity', '',
      'A retry must retain its identity and reject a changed payload.', '',
      '## History', '',
      'An unrelated archive entry.', '',
    ].join('\n')],
    ['tech/Peer.md', '# Peer\n\nLinked reference.\n'],
  ]);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const result = lookup(options, { query: 'retry deadline identity', max_bytes: 24000 });
  const recovery = result.evidence_units.find((unit) => unit.anchor.heading_path.at(-1) === 'Recovery');
  assert.ok(recovery?.excerpt.includes('Cancel pending work when the deadline expires.'));
  assert.equal(recovery.truncated, false);
  assert.ok(result.evidence_units.some((unit) => unit.anchor.heading_path.at(-1) === 'Identity'
    && unit.excerpt.includes('reject a changed payload')));
  assert.ok(!result.evidence_units.some((unit) => unit.anchor.heading_path.at(-1) === 'History'));
  assert.ok(result.relations.some((relation) => relation.predicate === 'links_to'));
  assert.equal(Buffer.byteLength(JSON.stringify(result)), result.budget.used_bytes);
  assert.ok(result.budget.used_bytes <= 24000);

  const bounded = lookup(options, { query: 'Recovery', max_bytes: 5000 });
  const partial = bounded.evidence_units.find((unit) => unit.id === recovery.id);
  assert.ok(partial?.truncated);
  assert.ok(recovery.excerpt.startsWith(partial.excerpt));
  assert.equal(partial.content_hash, recovery.content_hash);
  assert.equal(partial.source_revision, recovery.source_revision);
  assert.deepEqual(partial.anchor, recovery.anchor);
  assert.equal(Buffer.byteLength(JSON.stringify(bounded)), bounded.budget.used_bytes);
  assert.ok(bounded.budget.used_bytes <= 5000);
});

test('optional sibling context never evicts an already fitting graph bundle', async (t) => {
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Guide.md', '# Guide\n\n## Primary\n\nretry deadline [[Target]]\n\n## Sibling\n\nidentity ' + 'background '.repeat(200) + '\n'],
    ['tech/Target.md', '# Target\n\nLinked evidence.\n'],
  ]);
  for (const max_bytes of [2600, 3200, 4000]) {
    const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, { query: 'retry deadline identity', max_bytes });
    assert.equal(result.relations.length, 1, `budget ${max_bytes}`);
    const edge = result.relations[0];
    assert.ok(result.entities.some((entity) => entity.id === edge.subject));
    assert.ok(result.entities.some((entity) => entity.id === edge.object));
    assert.ok(result.evidence_units.some((unit) => unit.id === edge.evidence_unit_id));
    assert.equal(Buffer.byteLength(JSON.stringify(result)), result.budget.used_bytes);
    assert.ok(result.budget.used_bytes <= max_bytes);
  }
});

test('lookup selects complementary conditions before repetitive navigation consumes the budget', async (t) => {
  const noise = Array.from({ length: 16 }, (_, index) => [
    `tech/Archive-${index}.md`, `# Archive ${index}\n\nHistorical notes.\n`,
  ]);
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Guide.md', [
      '# Guide', '',
      '## Requests', '',
      'A request lease has a deadline. Each request lease respects the deadline. [[Archive-0]]', '',
      '## Identity', '',
      'The request identity must survive retries. Reject a different payload for the same identity.', '',
      '## Expiration', '',
      'Cancellation must stop outstanding work at the lease deadline.', '',
      ...noise.map((_, index) => `## Archive ${index}\n\nThe request lease has a deadline. ${'Historical background. '.repeat(35)} [[Archive-${index}]]\n`),
    ].join('\n')],
    ...noise,
  ]);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'request lease deadline identity cancellation', scope: ['tech/Guide.md'], max_bytes: 8000,
  });
  assert.ok(result.evidence_units.some((unit) => unit.anchor.heading_path.at(-1) === 'Identity'
    && unit.excerpt.includes('Reject a different payload')));
  assert.ok(result.evidence_units.some((unit) => unit.anchor.heading_path.at(-1) === 'Expiration'
    && unit.excerpt.includes('Cancellation must stop')));
  const linked = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'request lease deadline identity cancellation', max_bytes: 8000,
  });
  assert.ok(linked.evidence_units.some((unit) => unit.anchor.heading_path.at(-1) === 'Identity'
    && unit.excerpt.includes('Reject a different payload')));
  assert.ok(linked.evidence_units.some((unit) => unit.anchor.heading_path.at(-1) === 'Expiration'
    && unit.excerpt.includes('Cancellation must stop')));
  const ids = new Set(linked.evidence_units.map((unit) => unit.id));
  assert.equal(ids.size, linked.evidence_units.length);
  for (const relation of linked.relations) {
    assert.ok(ids.has(relation.evidence_unit_id));
    assert.ok(linked.entities.some((entity) => entity.id === relation.subject));
    assert.ok(linked.entities.some((entity) => entity.id === relation.object));
  }
  assert.equal(Buffer.byteLength(JSON.stringify(linked)), linked.budget.used_bytes);
  assert.ok(linked.budget.used_bytes <= 8000);
});

test('a condition after the excerpt limit is returned whole or omitted when it cannot fit', async (t) => {
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Guide.md', [
      '# Guide', '', '## Main', '',
      'A needle uses an alpha. The needle must retain its alpha.', '',
      '## Additional condition', '',
      'Background explanation. '.repeat(250),
      'The omega condition must also hold.', '',
    ].join('\n')],
  ]);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const args = { query: 'needle alpha omega', scope: ['tech'] };
  const full = lookup(options, { ...args, max_bytes: 16000 });
  const condition = full.evidence_units.find((unit) => unit.anchor.heading_path.at(-1) === 'Additional condition');
  assert.ok(condition?.excerpt.includes('omega condition must also hold'));
  assert.equal(condition.truncated, false);
  const bounded = lookup(options, { ...args, max_bytes: 5000 });
  assert.ok(!bounded.evidence_units.some((unit) => unit.id === condition.id),
    'a prefix containing none of the query terms must not use the remaining budget');
  assert.equal(Buffer.byteLength(JSON.stringify(bounded)), bounded.budget.used_bytes);
  assert.ok(bounded.budget.used_bytes <= 5000);
});

test('a complementary section in a graph-selected document keeps its owning document', async (t) => {
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Needle-Alpha.md', '# Needle Alpha\n\nneedle needle alpha alpha request request [[Peer]]\n'],
    ['tech/Peer.md', '# Peer\n\n## Boundary\n\nThe omega condition rejects expired ownership.\n'],
    ...Array.from({ length: 5 }, (_, index) => [
      `tech/Archive-${index}.md`, `# Archive ${index}\n\nneedle needle alpha alpha request request\n`,
    ]),
  ]);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'needle alpha request omega', max_bytes: 16000,
  });
  const condition = result.evidence_units.find((unit) => unit.source_uri === 'tech/Peer.md'
    && unit.anchor.heading_path.at(-1) === 'Boundary');
  assert.ok(condition?.excerpt.includes('rejects expired ownership'));
  assert.ok(result.entities.some((entity) => entity.type === 'Document' && entity.label === 'Peer'));
  assert.equal(Buffer.byteLength(JSON.stringify(result)), result.budget.used_bytes);
  assert.ok(result.budget.used_bytes <= 16000);
});

test('multiple root links leave space for a complementary condition', async (t) => {
  const { repo, cacheDir } = await fixtureWithFiles(t, Array.from({ length: 6 }, (_, index) => [
    [`tech/Guide-${index}.md`, [
      `# Guide ${index}`, '', '## Primary', '',
      `needle alpha request retry deadline. needle alpha request retry deadline. [[Peer-${index}]]`, '',
      ...(index === 0 ? ['## Boundary', '', 'The omega condition rejects expired ownership.',
        'Check ownership before accepting the result. '.repeat(24), ''] : []),
    ].join('\n')],
    [`tech/Peer-${index}.md`, `# Peer ${index}\n\nHistorical reference.\n`],
  ]).flat());
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const query = 'needle alpha request retry deadline omega';
  const result = lookup(options, { query, max_bytes: 10000 });
  assert.ok(result.evidence_units.some((unit) => unit.anchor.heading_path.at(-1) === 'Boundary'
    && unit.excerpt.includes('rejects expired ownership')));
  assert.ok(result.relations.length > 0, 'one direct link still precedes complementary evidence');
  for (const relation of result.relations) {
    assert.ok(result.evidence_units.some((unit) => unit.id === relation.evidence_unit_id));
    assert.ok(result.entities.some((entity) => entity.id === relation.subject));
    assert.ok(result.entities.some((entity) => entity.id === relation.object));
  }
  assert.equal(Buffer.byteLength(JSON.stringify(result)), result.budget.used_bytes);
  assert.ok(result.budget.used_bytes <= 10000);
  const full = lookup(options, { query, max_bytes: 65536 });
  assert.equal(full.relations.length, 6, 'remaining direct links are retained when the budget allows');
});

test('condition hints prioritize an unrepresented requirement within the same byte budget', async (t) => {
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Guide.md', [
      '# Guide', '', '## Primary', '',
      'alpha beta gamma delta alpha beta gamma delta.', '',
      '## Background', '',
      'epsilon zeta theta iota kappa. ' + 'Background explanation. '.repeat(55), '',
      '## Boundary', '',
      'recovery cancellation must preserve the pending identity.', '',
    ].join('\n')],
  ]);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const args = { query: 'alpha beta gamma delta epsilon zeta theta iota kappa recovery cancellation', max_bytes: 3900 };
  const ordinary = lookup(options, args);
  const focused = lookup(options, { ...args, conditions: [
    'alpha beta gamma delta epsilon zeta theta iota kappa', 'recovery cancellation',
  ] });
  assert.ok(!ordinary.evidence_units.some((unit) => unit.excerpt.includes('preserve the pending identity')));
  assert.ok(focused.evidence_units.some((unit) => unit.excerpt.includes('preserve the pending identity')));
  assert.equal(focused.query, args.query);
  assert.equal(Buffer.byteLength(JSON.stringify(focused)), focused.budget.used_bytes);
  assert.ok(focused.budget.used_bytes <= args.max_bytes);
});

test('condition hints keep exact-title lookup useful and preserve pinned source receipts', async (t) => {
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Guide.md', '# Guide\n\nRequest retries follow a deadline.\n\n## Identity\n\nAn idempotency key rejects changed payloads.\n'],
  ]);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  const focused = lookup(options, { query: 'Guide', conditions: ['idempotency key'], max_bytes: 5000 });
  const unit = focused.evidence_units.find((item) => item.excerpt.includes('rejects changed payloads'));
  assert.ok(unit);
  const original = loadSnapshot({ repo, cacheDir }).entities.find((item) => item.id === unit.id);
  assert.equal(unit.content_hash, original.content_hash);
  assert.equal(unit.source_revision, original.source_revision);
  assert.equal(Buffer.byteLength(JSON.stringify(focused)), focused.budget.used_bytes);
});

test('condition hints reject invalid input and cannot change search scope', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  const options = { repo, cacheDir, allowlist: ['tech'] };
  for (const conditions of [null, [], [' '], ['the and'], ['x'], [3], ['a', 'b', 'c', 'd'], ['한'.repeat(342)]]) {
    assert.throws(() => lookup(options, { query: 'event', conditions }), (error) => error.code === 'invalid_conditions');
  }
  assert.throws(() => search(options, { query: 'event', conditions: ['retry'] }),
    (error) => error.code === 'invalid_arguments');
  const absent = lookup(options, { query: 'event', conditions: ['consumer'], scope: ['biz'], max_bytes: 5000 });
  assert.deepEqual(absent.evidence_units, []);
  assert.equal(absent.index_sync[0].requested_scope_indexed, false);
});

test('condition hints retain an exact metadata root when their rare term is elsewhere', async (t) => {
  const providerNotes = Array.from({ length: 6 }, (_, index) => [
    `tech/Provider-Note-${index}.md`, `# Provider Note ${index}\n\nProvider integration notes.\n`,
  ]);
  const { repo, cacheDir } = await fixtureWithFiles(t, [
    ['tech/Provider.md', '# Provider\n\nProvider configuration reference.\n'],
    ['tech/Thanos.md', '# Thanos\n\nThanos is a separate condition reference.\n'],
    ...providerNotes,
  ]);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'Provider', conditions: ['Thanos'], scope: ['tech'], max_bytes: 65536,
  });

  assert.equal(result.matching.assessment, 'exact_metadata');
  assert.ok(result.entities.some((entity) => entity.type === 'Document' && entity.label === 'Provider'));
  assert.ok(result.evidence_units.some((unit) => unit.source_uri === 'tech/Provider.md'
    && unit.excerpt.includes('Provider configuration reference')));
});
