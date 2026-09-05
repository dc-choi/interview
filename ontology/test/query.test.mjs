import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { ContextError } from '../src/core.mjs';
import { lookup } from '../src/query.mjs';
import { buildSnapshot } from '../src/snapshot.mjs';

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

test('lookup returns exact alias, source-backed sections, and an outgoing relation', async (t) => {
  const { repo, cacheDir } = await fixture(t);
  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: '이벤트 발행', scope: ['tech'], depth: 1, max_bytes: 65536,
  });

  assert.equal(result.result_status, 'ok');
  assert.equal(result.index_sync[0].status, 'synced');
  assert.ok(result.entities.some((entity) => entity.label === '이벤트 발행'));
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
