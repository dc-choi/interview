import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { DEFAULT_SCOPES, sha256 } from '../src/core.mjs';
import { loadSnapshot } from '../src/snapshot.mjs';
import { prepareCases, scoreResult } from './score.mjs';

const MAX_PAGES = 32;
const MAX_OUTLINE_BYTES = 2 * 1024 * 1024;
const PAGE_BYTES = 24000;
const cli = new URL('../src/cli.mjs', import.meta.url);
const { values } = parseArgs({ options: {
  cache: { type: 'string' },
  cases: { type: 'string' },
  check: { type: 'boolean', default: false },
} });
const options = {
  repo: fileURLToPath(new URL('../..', import.meta.url)),
  cacheDir: values.cache,
  allowlist: DEFAULT_SCOPES,
};
const caseBytes = readFileSync(values.cases ?? new URL('./generalization-cases-2026-09-07.json', import.meta.url));
const snapshot = loadSnapshot(options);
const entities = new Map(snapshot.entities.map((entity) => [entity.id, entity]));
const cases = prepareCases(JSON.parse(caseBytes), snapshot, options.repo);
const totals = { lookup_calls: 0, lookup_bytes: 0, outline_calls: 0, outline_bytes: 0 };
const bytes = (value) => Buffer.byteLength(JSON.stringify(value), 'utf8');

function headingScore(sample, lookup, receipts) {
  if (sample.expected_empty) return null;
  const target = ({ any_text, all_text, ...rest }) => rest;
  const headingCase = { ...sample };
  if (sample.expected_evidence_groups) {
    headingCase.expected_evidence_groups = sample.expected_evidence_groups.map((group) => ({
      ...group, any_of: group.any_of.map(target),
    }));
  } else headingCase.expected_evidence = sample.expected_evidence.map(target);
  const result = { ...lookup, evidence_units: receipts.map((item) => ({ ...item, excerpt: '', truncated: true })) };
  const score = scoreResult(headingCase, result);
  return {
    document_hit: score.document_hit,
    heading_hit: score.heading_hit,
    heading_groups_total: score.evidence_groups_total,
    heading_groups_hit: score.evidence_groups_hit,
    heading_recall: score.evidence_recall,
  };
}

const args = [fileURLToPath(cli), 'serve', '--repo', options.repo, '--committed-only'];
if (options.cacheDir) args.push('--cache', options.cacheDir);
args.push(...DEFAULT_SCOPES.flatMap((scope) => ['--allow', scope]));
const transport = new StdioClientTransport({ command: process.execPath, args, stderr: 'pipe' });
const client = new Client({ name: 'outline-navigation-evaluation', version: '0.1.0' });

async function call(name, input) {
  const kind = name === 'context_lookup' ? 'lookup' : 'outline';
  const response = await client.request({ method: 'tools/call', params: { name, arguments: input } }, CallToolResultSchema);
  totals[`${kind}_calls`] += 1;
  const payload = response.structuredContent;
  totals[`${kind}_bytes`] += bytes(payload ?? {});
  assert.equal(response.content.find((item) => item.type === 'text')?.text, JSON.stringify(payload), 'MCP text/JSON mismatch');
  if (response.isError) throw new Error(payload?.error?.code ?? 'MCP tool error');
  assert.ok(payload?.budget, 'missing budget');
  assert.equal(payload.budget.used_bytes, bytes(payload));
  assert.equal(payload.budget.requested_max_bytes, input.max_bytes);
  assert.equal(payload.budget.server_max_bytes, 65536);
  assert.equal(payload.budget.effective_max_bytes, Math.min(input.max_bytes, 65536));
  assert.ok(bytes(payload) <= payload.budget.effective_max_bytes, 'response over budget');
  assert.ok(payload.index_sync?.length, 'missing index status');
  assert.ok(payload.index_sync.every((index) => index.revision === snapshot.manifest.revision
    && index.artifacts_verified && index.completed), 'snapshot mismatch');
  return payload;
}

async function navigate(documentId, navigation) {
  const document = entities.get(documentId);
  assert.equal(document?.type, 'Document');
  const detail = { id: documentId, pages: 0, sections: 0, complete: false };
  navigation.documents.push(detail);
  const expectedSections = new Set(snapshot.entities
    .filter((entity) => entity.type === 'Section' && entity.source_uri === document.source_uri)
    .map((entity) => entity.id));
  let offset = 0;
  let total = null;
  let previous = null;
  const seen = new Set();
  while (detail.pages < MAX_PAGES) {
    const remaining = MAX_OUTLINE_BYTES - totals.outline_bytes;
    if (remaining <= 0) throw new Error('outline_byte_cap_reached');
    const page = await call('context_outline', {
      document_id: documentId,
      source_revision: snapshot.manifest.revision,
      offset_sections: offset,
      max_bytes: Math.min(PAGE_BYTES, remaining),
    });
    detail.pages += 1;
    assert.equal(page.document.id, documentId);
    assert.equal(page.document.source_uri, document.source_uri);
    assert.equal(page.document.source_revision, snapshot.manifest.revision);
    assert.equal(page.document.content_hash, document.content_hash);
    assert.ok(Array.isArray(page.sections));
    assert.equal(page.pagination.offset_sections, offset);
    assert.ok(Number.isSafeInteger(page.pagination.total_sections) && page.pagination.total_sections >= 0);
    total ??= page.pagination.total_sections;
    assert.equal(page.pagination.total_sections, total);
    assert.equal(total, expectedSections.size, 'incomplete document outline');
    for (const section of page.sections) {
      const canonical = entities.get(section.id);
      assert.equal(canonical?.type, 'Section');
      assert.equal(canonical.source_uri, document.source_uri);
      assert.equal(section.source_uri, document.source_uri);
      assert.equal(section.source_revision, snapshot.manifest.revision);
      assert.equal(section.content_hash, canonical.content_hash);
      assert.deepEqual(section.anchor, canonical.anchor);
      assert.ok(!seen.has(section.id), 'duplicate section');
      if (previous) assert.ok(previous.anchor.start_byte < section.anchor.start_byte
        || (previous.anchor.start_byte === section.anchor.start_byte && previous.id.localeCompare(section.id) < 0), 'section order');
      seen.add(section.id);
      previous = section;
      navigation.receipts.push(section);
    }
    detail.sections += page.sections.length;
    const next = offset + page.sections.length;
    if (page.pagination.complete) {
      assert.equal(next, total);
      assert.equal(page.pagination.next_offset_sections, null);
      assert.deepEqual(seen, expectedSections, 'missing canonical section');
      detail.complete = true;
      return;
    }
    assert.ok(next > offset && next < total, 'nonprogressing outline cursor');
    assert.equal(page.pagination.next_offset_sections, next);
    offset = next;
  }
  throw new Error('outline_page_cap_reached');
}

const started = performance.now();
const results = [];
let tools;
try {
  await client.connect(transport);
  tools = (await client.listTools()).tools.map((tool) => tool.name).sort();
  assert.ok(['context_lookup', 'context_read', 'context_outline'].every((name) => tools.includes(name)));
  for (const sample of cases) {
    const began = performance.now();
    const startCounts = { ...totals };
    const result = {
      id: sample.id, query: sample.query, scope: sample.scope, max_bytes: sample.max_bytes,
      expected_empty: sample.expected_empty ?? false,
      navigation: { documents: [], receipts: [], skipped: false, skip_reason: null },
      navigation_had_body_evidence: false, errors: [],
    };
    try {
      const lookup = await call('context_lookup', { query: sample.query, scope: sample.scope, max_bytes: sample.max_bytes });
      assert.ok(Array.isArray(lookup.evidence_units) && Array.isArray(lookup.entities));
      assert.ok(lookup.evidence_units.every((unit) => unit.source_revision === snapshot.manifest.revision));
      result.before = scoreResult(sample, lookup);
      result.before_heading = headingScore(sample, lookup, lookup.evidence_units);
      result.lookup = {
        matching: lookup.matching,
        index_status: lookup.index_sync[0].status,
        budget_exhausted: lookup.budget.exhausted,
        traversal_limit_reached: lookup.traversal.limit_reached,
      };
      if (lookup.matching?.assessment === 'weak_lexical_overlap') {
        result.navigation.skipped = true;
        result.navigation.skip_reason = 'weak_lexical_overlap';
      } else {
        const documents = lookup.entities.filter((entity) => entity.type === 'Document');
        assert.equal(new Set(documents.map((doc) => doc.id)).size, documents.length);
        for (const document of documents) await navigate(document.id, result.navigation);
        result.after_heading = headingScore(sample, lookup, result.navigation.receipts);
      }
    } catch (error) {
      result.errors.push({ code: error.code ?? 'protocol_error', message: error.message });
    }
    result.navigation.sections = result.navigation.receipts.length;
    delete result.navigation.receipts;
    result.calls = { lookup: totals.lookup_calls - startCounts.lookup_calls, outline: totals.outline_calls - startCounts.outline_calls };
    result.bytes = { lookup: totals.lookup_bytes - startCounts.lookup_bytes, outline: totals.outline_bytes - startCounts.outline_bytes };
    result.incomplete = result.errors.length > 0;
    result.elapsed_ms = Math.round(performance.now() - began);
    results.push(result);
  }
} finally {
  await client.close();
  await transport.close();
}
const navigated = results.filter((result) => result.after_heading);
const positive = cases.filter((sample) => !sample.expected_empty);
const headingGroupsTotal = positive.reduce((sum, sample) => sum + (sample.expected_evidence_groups?.length ?? 1), 0);
const headingGroupsHit = navigated.reduce((sum, result) => sum + result.after_heading.heading_groups_hit, 0);
const report = {
  observed_at: new Date().toISOString(),
  source_revision: snapshot.manifest.revision,
  fingerprint: snapshot.fingerprint,
  hashes: Object.fromEntries(Object.entries({
    query_code_hash: '../src/query.mjs', outline_code_hash: '../src/outline.mjs', read_code_hash: '../src/read-evidence.mjs',
    server_code_hash: '../src/server.mjs', cli_code_hash: '../src/cli.mjs', score_code_hash: './score.mjs', harness_code_hash: './outline-navigation.mjs',
  }).map(([key, file]) => [key, sha256(readFileSync(new URL(file, import.meta.url)))])),
  cases_hash: sha256(caseBytes),
  limits: { max_pages_per_document: MAX_PAGES, total_outline_response_bytes_cap: MAX_OUTLINE_BYTES, page_max_bytes: PAGE_BYTES },
  mcp_tools: tools,
  check_mode: 'protocol_only',
  policy: { select_all_returned_documents: true, navigation_has_body_evidence: false, byte_metrics_exclude_mcp_envelope: true },
  totals: { ...totals, elapsed_ms: Math.round(performance.now() - started), incomplete_cases: results.filter((result) => result.incomplete).map((result) => result.id) },
  before: { complete_case_passes: results.filter((result) => result.before?.passed).length, body_hits: results.filter((result) => result.before?.body_hit).length },
  after_heading: {
    cases: positive.length, evaluated_cases: navigated.length,
    document_hits: navigated.filter((result) => result.after_heading.document_hit).length,
    heading_hits: navigated.filter((result) => result.after_heading.heading_hit).length,
    heading_groups_total: headingGroupsTotal, heading_groups_hit: headingGroupsHit,
    heading_recall: headingGroupsTotal ? headingGroupsHit / headingGroupsTotal : null,
  },
  cases: results,
};
console.log(JSON.stringify(report, null, 2));
if (values.check && report.totals.incomplete_cases.length) process.exitCode = 1;
