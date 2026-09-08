import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { DEFAULT_SCOPES, inScope, normalizeScopes, sha256 } from '../src/core.mjs';
import { loadSnapshot } from '../src/snapshot.mjs';

export const LIMITS = Object.freeze({ calls: 8, bytes: 64000, page: 24000, searches: 3, outlines: 2, reads: 4 });
const bytes = (value) => Buffer.byteLength(JSON.stringify(value));
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const names = ['context_lookup', 'context_search', 'context_outline', 'context_read'];

/** Replays decisions made by an AI host. It neither plans queries nor judges semantic support. */
export async function replayPlan(call, plan) {
  assert.ok(text(plan.id) && text(plan.query));
  assert.ok(Array.isArray(plan.scope) && plan.scope.length > 0);
  const scope = normalizeScopes(plan.scope);
  assert.ok(plan.conditions.length > 0 && plan.conditions.length <= 3);
  const conditions = new Set(plan.conditions.map((condition) => condition.id));
  assert.equal(conditions.size, plan.conditions.length);
  assert.ok(plan.conditions.every((condition) => text(condition.id) && text(condition.question)));
  assert.ok(plan.conditions.every((condition) => ['stated_requirement', 'assumption'].includes(condition.origin)), 'condition origin required');
  assert.ok(plan.steps.length > 0 && plan.steps.length <= LIMITS.calls, 'call limit');
  const first = plan.steps[0];
  assert.equal(first.name, 'context_lookup');
  assert.equal(first.arguments.query, plan.query, 'original query required first');
  assert.equal(first.arguments.max_bytes, LIMITS.page);
  assert.ok(first.arguments.depth === undefined || first.arguments.depth === 1, 'baseline depth must be 1');
  const counts = { searches: 0, outlines: 0, reads: 0 };
  const documents = new Set();
  const receipts = new Map();
  const units = new Map();
  const entities = new Map();
  const relations = new Map();
  const pages = new Map();
  const outlines = new Map();
  const cursors = new Map();
  const calls = [];
  let used = 0;
  let revision;
  let initial;
  for (const step of plan.steps) {
    assert.ok(names.includes(step.name), 'read-only retrieval tools only');
    assert.ok(text(step.reason) && step.condition_ids.length > 0);
    assert.ok(step.condition_ids.every((id) => conditions.has(id)), 'unknown condition');
    const args = step.arguments;
    assert.ok(Number.isSafeInteger(args.max_bytes) && args.max_bytes > 0
      && args.max_bytes <= Math.min(LIMITS.page, LIMITS.bytes - used), 'remaining byte budget');
    const kind = step.name === 'context_read' ? 'reads' : step.name === 'context_outline' ? 'outlines' : 'searches';
    assert.ok(++counts[kind] <= LIMITS[kind], `${kind} limit`);
    const searchKey = JSON.stringify([args.query, scope]);
    if (kind === 'searches') {
      assert.deepEqual(normalizeScopes(args.scope), scope, 'query scope changed');
      if (args.cursor !== undefined) assert.equal(args.cursor, cursors.get(searchKey), 'cursor not previously returned');
    }
    else {
      assert.equal(args.source_revision, revision, 'source revision changed');
      if (kind === 'outlines') {
        assert.ok(documents.has(args.document_id), 'document not previously returned');
        assert.equal(args.offset_sections ?? 0, outlines.has(args.document_id)
          ? outlines.get(args.document_id).next_offset_sections : 0, 'outline offset not previously returned');
      }
      else {
        const known = receipts.get(args.evidence_unit_id);
        if (step.expected_error === undefined) assert.ok(known, 'receipt not previously returned');
        if (known) assert.equal(args.content_hash, known.content_hash, 'receipt hash changed');
      }
    }
    if (step.expected_error !== undefined) {
      assert.equal(kind, 'reads');
      assert.equal(step.expected_error, 'evidence_not_found');
    }
    const began = performance.now();
    const response = await call(step.name, args);
    const payload = response.structuredContent;
    assert.ok(payload && response.content.some((item) => item.type === 'text' && item.text === JSON.stringify(payload)));
    used += bytes(payload);
    assert.ok(used <= LIMITS.bytes, 'total byte budget');
    calls.push({ ...step, response: payload, is_error: Boolean(response.isError), elapsed_ms: performance.now() - began });
    if (step.expected_error !== undefined) {
      assert.ok(response.isError, 'declared failed attempt unexpectedly returned evidence');
      assert.equal(payload.error?.code, step.expected_error);
    } else assert.ok(!response.isError, 'undeclared tool error changed the frozen path');
    if (response.isError) continue; // Failed attempts still spend a call and response bytes.
    assert.equal(payload.budget.used_bytes, bytes(payload));
    assert.ok(bytes(payload) <= args.max_bytes);
    assert.ok(payload.index_sync?.length > 0);
    for (const sync of payload.index_sync) {
      revision ??= sync.revision;
      assert.equal(sync.revision, revision, 'mixed source revisions');
      assert.ok(sync.artifacts_verified && sync.completed);
      if (kind === 'searches') assert.ok(sync.requested_scope_indexed);
    }
    if (calls.length === 1) initial = payload;
    if (kind === 'reads') {
      assert.equal(payload.evidence_unit?.id, args.evidence_unit_id);
      assert.equal(payload.evidence_unit.content_hash, args.content_hash);
    }
    if (kind === 'outlines') {
      assert.equal(payload.document?.id, args.document_id);
      const previous = outlines.get(args.document_id);
      if (previous) assert.equal(payload.pagination.total_sections, previous.total_sections);
      assert.equal(payload.pagination.offset_sections, args.offset_sections ?? 0);
      const next = (args.offset_sections ?? 0) + payload.sections.length;
      assert.equal(payload.pagination.next_offset_sections, payload.pagination.complete ? null : next);
      assert.ok(payload.pagination.complete ? next === payload.pagination.total_sections
        : next > (args.offset_sections ?? 0) && next < payload.pagination.total_sections);
      outlines.set(args.document_id, payload.pagination);
    }
    if (step.name === 'context_search') cursors.set(searchKey, payload.pagination.next_cursor);
    for (const entity of [...(payload.entities ?? []), ...(payload.candidates ?? []).map((item) => item.document)]) {
      entities.set(entity.id, entity);
      if (entity.type === 'Document') documents.add(entity.id);
    }
    for (const relation of payload.relations ?? []) relations.set(relation.id, relation);
    const returned = [...(payload.evidence_units ?? []), ...(payload.sections ?? []),
      ...(payload.candidates ?? []).flatMap((item) => item.best_evidence_ref ? [item.best_evidence_ref] : []),
      ...(payload.evidence_unit ? [payload.evidence_unit] : [])];
    for (const unit of returned) {
      assert.ok(inScope(unit.source_uri, scope), 'out of scope evidence');
      assert.equal(unit.source_revision, revision);
      const known = receipts.get(unit.id);
      if (known) {
        assert.equal(unit.content_hash, known.content_hash);
        assert.deepEqual(unit.anchor, known.anchor);
        assert.equal(unit.source_uri, known.source_uri);
      }
      receipts.set(unit.id, unit);
      if (unit.excerpt === undefined) continue; // A heading is not body evidence.
      let candidate = unit;
      if (kind === 'reads') {
        const offset = args.offset_bytes ?? 0;
        const prefix = offset === 0 ? '' : pages.get(unit.id);
        assert.equal(payload.pagination.offset_bytes, offset, 'read offset changed');
        assert.ok(prefix !== undefined && Buffer.byteLength(prefix) === offset, 'noncontiguous read');
        const assembled = prefix + unit.excerpt;
        const end = Buffer.byteLength(assembled);
        assert.equal(payload.pagination.next_offset_bytes, payload.pagination.complete ? null : end);
        assert.ok(payload.pagination.complete ? end === payload.pagination.total_bytes : end > offset);
        if (payload.pagination.complete) assert.equal(`sha256:${sha256(assembled)}`, unit.content_hash);
        pages.set(unit.id, assembled);
        candidate = { ...unit, excerpt: assembled, truncated: !payload.pagination.complete };
      }
      const previous = units.get(unit.id);
      if (!previous || Buffer.byteLength(candidate.excerpt) > Buffer.byteLength(previous.excerpt)) units.set(unit.id, candidate);
    }
  }
  assert.ok(initial?.evidence_units, 'initial lookup failed');
  assert.equal(plan.assessments.length, conditions.size);
  assert.deepEqual(new Set(plan.assessments.map((item) => item.condition_id)), conditions);
  for (const assessment of plan.assessments) {
    assert.ok(['supported', 'contradicted', 'unresolved'].includes(assessment.status));
    assert.ok(text(assessment.reason));
    assert.ok(Array.isArray(assessment.evidence));
    if (assessment.status !== 'unresolved') assert.ok(assessment.evidence.length > 0);
    for (const evidence of assessment.evidence) {
      assert.ok(text(evidence.quote) && units.get(evidence.id)?.excerpt.includes(evidence.quote), 'quote not in returned text');
      assert.equal(evidence.source_revision, receipts.get(evidence.id).source_revision, 'assessment revision mismatch');
      assert.equal(evidence.content_hash, receipts.get(evidence.id).content_hash, 'assessment hash mismatch');
    }
  }
  return { id: plan.id, initial, assembled: { ...initial, evidence_units: [...units.values()],
    entities: [...entities.values()], relations: [...relations.values()] }, calls, used_bytes: used, revision };
}

async function main() {
  const { values } = parseArgs({ options: { plans: { type: 'string' }, questions: { type: 'string' }, labels: { type: 'string' },
    output: { type: 'string' }, cache: { type: 'string' }, 'expected-plans-hash': { type: 'string' } } });
  assert.ok(values.plans && values.questions && values.labels && values.output && values['expected-plans-hash'],
    '--plans, --questions, --labels, --output, --expected-plans-hash required');
  const repo = fileURLToPath(new URL('../..', import.meta.url));
  const rawPlans = readFileSync(values.plans);
  assert.equal(sha256(rawPlans), values['expected-plans-hash'], 'pre-scoring plan hash mismatch');
  const plans = JSON.parse(rawPlans);
  const rawQuestions = readFileSync(values.questions);
  const questions = JSON.parse(rawQuestions);
  assert.ok(plans.length > 0 && new Set(plans.map((plan) => plan.id)).size === plans.length);
  assert.equal(questions.length, plans.length);
  assert.equal(new Set(questions.map((question) => question.id)).size, questions.length);
  for (const plan of plans) {
    const question = questions.find((item) => item.id === plan.id);
    assert.equal(plan.query, question?.query);
    assert.deepEqual(plan.scope, question.scope);
  }
  const files = ['src/query.mjs', 'src/server.mjs', 'src/cli.mjs', 'src/core.mjs', 'src/outline.mjs',
    'src/read-evidence.mjs', 'src/snapshot.mjs', 'src/repository.mjs', 'evaluation/score.mjs', 'evaluation/condition-followup.mjs',
    '../.agents/skills/development-context/SKILL.md', '../.claude/skills/development-context/SKILL.md'];
  const hashes = () => Object.fromEntries(files.map((file) => [file, sha256(readFileSync(new URL(`../${file}`, import.meta.url)))]));
  const codeHashes = hashes();
  const options = { repo, cacheDir: values.cache, allowlist: DEFAULT_SCOPES };
  let snapshot;
  const transport = new StdioClientTransport({ command: process.execPath, stderr: 'pipe',
    args: [fileURLToPath(new URL('../src/cli.mjs', import.meta.url)), 'serve', '--repo', repo, '--committed-only',
      ...(values.cache ? ['--cache', values.cache] : [])] });
  const client = new Client({ name: 'condition-followup-evaluation', version: '0.1.0' });
  const results = [];
  try {
    await client.connect(transport);
    snapshot = loadSnapshot(options);
    const call = async (name, args) => {
      const result = await client.request({ method: 'tools/call', params: { name, arguments: args } }, CallToolResultSchema);
      if (!result.isError && ['context_lookup', 'context_search'].includes(name)) {
        for (const sync of result.structuredContent.index_sync) {
          assert.equal(sync.fingerprint, snapshot.fingerprint, 'snapshot fingerprint changed');
          assert.equal(sync.manifest_hash, snapshot.manifest_hash, 'snapshot manifest changed');
        }
      }
      return result;
    };
    for (const plan of plans) {
      const result = await replayPlan(call, plan);
      assert.equal(result.revision, snapshot.manifest.revision);
      const began = performance.now();
      const control = await call('context_lookup', { query: plan.query, scope: plan.scope, max_bytes: LIMITS.bytes });
      assert.ok(!control.isError);
      assert.equal(control.structuredContent.budget.used_bytes, bytes(control.structuredContent));
      assert.ok(bytes(control.structuredContent) <= LIMITS.bytes);
      assert.ok(control.structuredContent.index_sync.every((sync) => sync.revision === result.revision));
      results.push({ ...result, control: control.structuredContent, control_elapsed_ms: performance.now() - began });
    }
  } finally {
    await client.close();
    await transport.close();
  }
  const completedSnapshot = loadSnapshot(options);
  assert.equal(completedSnapshot.fingerprint, snapshot.fingerprint);
  assert.equal(completedSnapshot.manifest_hash, snapshot.manifest_hash);
  // Gold is opened only after every frozen host path and control has executed.
  const rawLabels = readFileSync(values.labels);
  const labels = JSON.parse(rawLabels);
  const { prepareCases, scoreResult } = await import('./score.mjs');
  const cases = prepareCases(labels.map((label) => ({ ...questions.find((question) => question.id === label.id),
    expected_evidence_groups: label.expected_evidence_groups.map((group) => ({ ...group, any_of: group.any_of.map((target) => {
      const sameHeading = snapshot.entities.filter((entity) => entity.type === 'Section' && entity.source_uri === target.source_uri
        && entity.anchor.heading_path.at(-1) === target.heading_path.at(-1));
      assert.equal(sameHeading.length, 1, 'gold heading must be unambiguous for the existing scorer');
      assert.deepEqual(sameHeading[0].anchor.heading_path, target.heading_path);
      return { path: target.source_uri, heading: target.heading_path.at(-1), all_text: target.all_text };
    }) })),
  })), snapshot, repo);
  assert.equal(cases.length, plans.length);
  const scored = results.map((result, index) => {
    const sample = cases.find((item) => item.id === result.id);
    assert.equal(sample?.query, plans[index].query);
    assert.deepEqual(sample.scope, normalizeScopes(plans[index].scope));
    return { ...result, host_conditions: plans[index].conditions, host_assessments: plans[index].assessments,
      scores: { single_24000: scoreResult(sample, result.initial), single_64000: scoreResult(sample, result.control),
        followup_64000: scoreResult(sample, result.assembled) } };
  });
  assert.deepEqual(hashes(), codeHashes, 'code changed during replay');
  assert.equal(sha256(readFileSync(values.plans)), sha256(rawPlans), 'plans changed during replay');
  assert.equal(sha256(readFileSync(values.questions)), sha256(rawQuestions), 'questions changed during replay');
  assert.equal(sha256(readFileSync(values.labels)), sha256(rawLabels), 'labels changed during scoring');
  const summary = Object.fromEntries(['single_24000', 'single_64000', 'followup_64000'].map((arm) => [arm, {
    passed: scored.filter((item) => item.scores[arm].passed).length,
    groups_hit: scored.reduce((sum, item) => sum + (item.scores[arm].evidence_groups_hit ?? 0), 0),
    groups_total: scored.reduce((sum, item) => sum + (item.scores[arm].evidence_groups_total ?? 0), 0),
  }]));
  const report = { observed_at: new Date().toISOString(), revision: snapshot.manifest.revision, fingerprint: snapshot.fingerprint,
    replay_artifact_hashes: codeHashes, plans_hash: sha256(rawPlans), questions_hash: sha256(rawQuestions), labels_hash: sha256(rawLabels), limits: LIMITS,
    policy: { supplied_pre_scoring_plan_hash_verified: true, blind_authorship_requires_external_provenance: true,
      gold_loaded_after_retrieval: true, semantic_assessments_by_host_not_validator: true,
      assembled_scoring_is_not_one_mcp_response: true, bytes_exclude_mcp_envelope: true,
      elapsed_is_replay_tools_only_excludes_host_reasoning: true }, summary, cases: scored };
  writeFileSync(values.output, JSON.stringify(report, null, 2).replaceAll('\u00b7', '\\u00b7') + '\n');
  console.log(JSON.stringify(summary));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
