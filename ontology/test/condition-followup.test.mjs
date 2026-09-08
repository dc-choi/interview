import assert from 'node:assert/strict';
import test from 'node:test';
import { replayPlan } from '../evaluation/condition-followup.mjs';
import { sha256 } from '../src/core.mjs';

const revision = 'a'.repeat(40);
const content = '# Rule\n\n재시도는 중복을 만들 수 있다. 중복 처리는 멱등성을 확인한다.\n';
const unit = { id: 'unit:rule', source_uri: 'tech/rule.md', source_revision: revision,
  content_hash: `sha256:${sha256(content)}`, anchor: { start_byte: 0, end_byte: Buffer.byteLength(content) } };
const sync = [{ revision, artifacts_verified: true, completed: true, requested_scope_indexed: true }];
function response(payload) {
  payload.budget = { used_bytes: 0 };
  while (payload.budget.used_bytes !== Buffer.byteLength(JSON.stringify(payload))) {
    payload.budget.used_bytes = Buffer.byteLength(JSON.stringify(payload));
  }
  return { content: [{ type: 'text', text: JSON.stringify(payload) }], structuredContent: payload };
}
const plan = () => ({ id: 'conditions', query: '재시도 중복 처리', scope: ['tech'],
  conditions: [{ id: 'duplicates', question: '중복 가능성과 처리 조건은?', origin: 'stated_requirement' }],
  steps: [
    { name: 'context_lookup', arguments: { query: '재시도 중복 처리', scope: ['tech'], max_bytes: 24000 },
      condition_ids: ['duplicates'], reason: '질문으로 후보 찾기' },
    { name: 'context_read', arguments: { evidence_unit_id: unit.id, source_revision: revision,
      content_hash: unit.content_hash, max_bytes: 24000 }, condition_ids: ['duplicates'], reason: '잘린 조건 확인' },
  ], assessments: [{ condition_id: 'duplicates', status: 'supported', reason: '반환된 본문에서 조건 확인',
    evidence: [{ id: unit.id, source_revision: revision, content_hash: unit.content_hash,
      quote: '중복 처리는 멱등성을 확인한다.' }] }] });
function v2Plan() {
  const result = plan();
  const assessment = result.assessments[0];
  const [idempotencyEvidence] = assessment.evidence;
  delete assessment.evidence;
  result.conditions[0].requirements = [
    { id: 'retry-duplicates', question: '재시도가 중복을 만들 수 있는가?' },
    { id: 'idempotency', question: '중복 처리에 멱등성이 필요한가?' },
  ];
  assessment.requirements = [
    { ...result.conditions[0].requirements[0], status: 'supported',
      reason: '반환된 본문이 재시도로 생기는 중복을 직접 설명한다.', evidence: [{ ...idempotencyEvidence, quote: '재시도는 중복을 만들 수 있다.' }] },
    { ...result.conditions[0].requirements[1], status: 'supported',
      reason: '반환된 본문이 중복 처리의 멱등성을 직접 설명한다.', evidence: [idempotencyEvidence] },
  ];
  result.sufficiency = { status: 'sufficient', reason: '두 원자 요구가 직접 근거로 확인됐다.', unresolved_condition_ids: [] };
  return result;
}
const call = async (name) => response(name === 'context_lookup'
  ? { index_sync: sync, evidence_units: [{ ...unit, excerpt: '# Rule\n', truncated: true }], entities: [], relations: [] }
  : { index_sync: sync, evidence_unit: { ...unit, excerpt: content, truncated: false },
    pagination: { offset_bytes: 0, next_offset_bytes: null, total_bytes: Buffer.byteLength(content), complete: true } });

test('host replay retains source receipts and reads a missing condition without gold inputs', async () => {
  const result = await replayPlan(call, plan());
  assert.equal(result.calls.length, 2);
  assert.equal(result.assembled.evidence_units.length, 1);
  assert.equal(result.assembled.evidence_units[0].excerpt, content);
  assert.equal(result.assembled.evidence_units[0].truncated, false);
  assert.ok(result.used_bytes <= 64000);
  assert.deepEqual(result.sufficiency, { status: 'not_assessed', reason: 'legacy trace has no atomic requirement coverage' });
});

test('v2 trace records atomic coverage and cannot call an unresolved condition sufficient', async () => {
  const sufficient = await replayPlan(call, v2Plan());
  assert.deepEqual(sufficient.sufficiency, { status: 'sufficient',
    reason: '두 원자 요구가 직접 근거로 확인됐다.', unresolved_condition_ids: [], assessment_version: 2 });

  const partial = v2Plan();
  partial.assessments[0].requirements[1] = { ...partial.conditions[0].requirements[1], status: 'unresolved',
    reason: '반환된 본문을 멱등성의 직접 근거로 쓰지 않는다.', evidence: [] };
  partial.assessments[0].status = 'unresolved';
  partial.sufficiency = { status: 'partial', reason: '중복 가능성은 확인됐지만 처리 조건이 남았다.', unresolved_condition_ids: ['duplicates'] };
  assert.equal((await replayPlan(call, partial)).sufficiency.status, 'partial');

  const insufficient = v2Plan();
  insufficient.assessments[0].requirements = insufficient.conditions[0].requirements.map((requirement) => ({ ...requirement,
    status: 'unresolved', reason: '반환된 본문을 이 원자 요구의 근거로 쓰지 않는다.', evidence: [] }));
  insufficient.assessments[0].status = 'unresolved';
  insufficient.sufficiency = { status: 'insufficient', reason: '직접 지지하는 원자 근거가 없다.', unresolved_condition_ids: ['duplicates'] };
  assert.equal((await replayPlan(call, insufficient)).sufficiency.status, 'insufficient');

  const falseComplete = structuredClone(partial);
  falseComplete.sufficiency.status = 'sufficient';
  falseComplete.sufficiency.unresolved_condition_ids = [];
  await assert.rejects(replayPlan(call, falseComplete), /sufficiency unresolved conditions/);

  const legacyComplete = plan();
  legacyComplete.sufficiency = { status: 'sufficient', reason: '기존 인용만으로 충분하다고 판단했다.', unresolved_condition_ids: [] };
  await assert.rejects(replayPlan(call, legacyComplete), /v2 atomic requirement inventory required/);

  const unresolvedWithQuote = structuredClone(insufficient);
  unresolvedWithQuote.assessments[0].requirements[0].evidence = structuredClone(plan().assessments[0].evidence);
  await assert.rejects(replayPlan(call, unresolvedWithQuote), /unresolved atomic requirement/);
});

test('v2 freezes atomic inventory before retrieval and checks assessed coverage afterward', async () => {
  const missingInventory = v2Plan();
  delete missingInventory.conditions[0].requirements;
  let calls = 0;
  await assert.rejects(replayPlan(async (...args) => {
    calls += 1;
    return call(...args);
  }, missingInventory), /v2 atomic requirement inventory required/);
  assert.equal(calls, 0);

  for (const change of [
    (item) => { item.assessments[0].requirements.pop(); },
    (item) => { item.assessments[0].requirements.push({ id: 'invented', question: '발견한 근거만 확인할까?' }); },
    (item) => { item.assessments[0].requirements[0].question = '다른 질문으로 바꿀까?'; },
  ]) {
    const changed = v2Plan();
    change(changed);
    calls = 0;
    await assert.rejects(replayPlan(async (...args) => {
      calls += 1;
      return call(...args);
    }, changed), /assessment atomic requirements must match planned inventory/);
    assert.equal(calls, 2);
  }
});

test('host replay rejects invented evidence, scope changes, overspending and unsupported quotations', async () => {
  for (const [change, error] of [
    [(item) => { delete item.conditions[0].origin; }, /condition origin/],
    [(item) => { item.steps[0].arguments.depth = 2; }, /baseline depth/],
    [(item) => { item.steps[1].arguments.evidence_unit_id = 'gold-only-id'; }, /not previously returned/],
    [(item) => { item.steps[0].arguments.scope = ['biz']; }, /scope changed/],
    [(item) => { item.steps[1].arguments.max_bytes = 64000; }, /byte budget/],
    [(item) => { item.steps[1].arguments.source_revision = 'b'.repeat(40); }, /revision changed/],
    [(item) => { item.steps[1].arguments.offset_bytes = 1; }, /offset|contiguous/],
    [(item) => { item.assessments[0].evidence[0].quote = 'Exactly once is guaranteed'; }, /quote not/],
    [(item) => { delete item.assessments[0].evidence[0].source_revision; }, /assessment revision/],
    [(item) => { item.assessments[0].evidence[0].content_hash = 'sha256:' + '0'.repeat(64); }, /assessment hash/],
  ]) {
    const changed = plan();
    change(changed);
    await assert.rejects(replayPlan(call, changed), error);
  }
  await assert.rejects(replayPlan(async (name) => {
    const result = await call(name);
    if (name === 'context_read') return response({ ...result.structuredContent,
      index_sync: [{ ...sync[0], revision: 'b'.repeat(40) }] });
    return result;
  }, plan()), /mixed source revisions/);
  const crowded = plan();
  crowded.steps.push(structuredClone(crowded.steps[1]));
  await assert.rejects(replayPlan(async (name) => response({ ...(await call(name)).structuredContent,
    padding: 'x'.repeat(22000) }), crowded), /remaining byte budget/);
});

test('replay binds navigation cursors and preserves declared failed attempts without accepting their evidence', async () => {
  const original = async (name) => name === 'context_lookup'
    ? response({ ...(await call(name)).structuredContent, entities: [{ id: 'doc:rule', type: 'Document' }] }) : call(name);
  for (const [step, error] of [
    [{ name: 'context_outline', arguments: { document_id: 'doc:rule', source_revision: revision,
      offset_sections: 2, max_bytes: 24000 } }, /outline offset/],
    [{ name: 'context_search', arguments: { query: '중복', scope: ['tech'], cursor: 'invented', max_bytes: 24000 } }, /cursor/],
  ]) {
    const changed = plan();
    changed.steps[1] = { ...changed.steps[1], ...step };
    await assert.rejects(replayPlan(original, changed), error);
  }
  const failed = plan();
  failed.steps.splice(1, 0, { ...structuredClone(failed.steps[1]), expected_error: 'evidence_not_found',
    arguments: { ...failed.steps[1].arguments, evidence_unit_id: 'mistyped-id' } });
  const result = await replayPlan(async (name, args) => args.evidence_unit_id === 'mistyped-id'
    ? { ...response({ error: { code: 'evidence_not_found' } }), isError: true } : call(name), failed);
  assert.equal(result.calls.length, 3);
  assert.equal(result.calls[1].is_error, true);
  assert.equal(result.used_bytes, result.calls.reduce((sum, item) => sum + Buffer.byteLength(JSON.stringify(item.response)), 0));
  await assert.rejects(replayPlan(call, failed), /unexpectedly returned evidence/);
  await assert.rejects(replayPlan(async (name) => name === 'context_read'
    ? { ...response({ error: { code: 'source_integrity_error' } }), isError: true } : call(name), plan()), /undeclared tool error/);
});
