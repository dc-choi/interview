import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { DEFAULT_SCOPES, sha256, stableJson } from '../src/core.mjs';
import { loadSnapshot } from '../src/snapshot.mjs';
import { prepareCases, scoreResult } from './score.mjs';

const MAX_PAGES_PER_UNIT = 32;
// Keeps one observational run from reading unbounded source material.
const MAX_TOTAL_READ_BYTES = 1024 * 1024;
const READ_PAGE_MAX_BYTES = 24000;
const harnessUrl = new URL('./read-followup.mjs', import.meta.url);
const cliUrl = new URL('../src/cli.mjs', import.meta.url);

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
const caseBytes = readFileSync(values.cases ?? new URL('./context-integrity-cases.json', import.meta.url));
const snapshot = loadSnapshot(options);
const cases = prepareCases(JSON.parse(caseBytes), snapshot, options.repo);

function outputBytes(payload) {
  return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}

function summarize(scores) {
  const grouped = scores.filter((score) => score.evidence_groups_total !== null);
  const total = grouped.reduce((sum, score) => sum + score.evidence_groups_total, 0);
  const hit = grouped.reduce((sum, score) => sum + score.evidence_groups_hit, 0);
  return {
    cases: scores.length,
    passed_cases: scores.filter((score) => score.passed).length,
    document_hits: scores.filter((score) => score.document_hit).length,
    heading_hits: scores.filter((score) => score.heading_hit).length,
    evidence_hits: scores.filter((score) => score.evidence_hit).length,
    body_asserted_cases: scores.filter((score) => score.body_hit !== null).length,
    body_hits: scores.filter((score) => score.body_hit).length,
    evidence_groups_total: total,
    evidence_groups_hit: hit,
    evidence_recall: grouped.length === 0 ? null : hit / total,
  };
}

function readIdentity(unit) {
  return {
    evidence_unit_id: unit.id,
    source_revision: unit.source_revision,
    content_hash: unit.content_hash,
  };
}

function protocolError(result) {
  return result?.isError || !result?.structuredContent ? result?.structuredContent?.error ?? { code: 'invalid_mcp_result' } : null;
}

function responseErrors(response, requestedMaxBytes) {
  const payload = response?.structuredContent;
  const errors = [];
  const text = response?.content?.find((item) => item.type === 'text')?.text;
  if (text !== JSON.stringify(payload)) errors.push({ code: 'mcp_json_mismatch' });
  if (!response?.isError && !payload?.budget) errors.push({ code: 'missing_response_budget' });
  if (payload?.budget) {
    const bytes = outputBytes(payload);
    if (payload.budget.used_bytes !== bytes || bytes > payload.budget.effective_max_bytes
      || bytes > requestedMaxBytes || bytes > 65536 || payload.budget.requested_max_bytes !== requestedMaxBytes
      || payload.budget.effective_max_bytes !== Math.min(requestedMaxBytes, 65536)
      || payload.budget.server_max_bytes !== 65536) errors.push({ code: 'invalid_response_budget' });
  }
  return errors;
}

async function connect() {
  const args = [fileURLToPath(cliUrl), 'serve', '--repo', options.repo];
  if (options.cacheDir) args.push('--cache', options.cacheDir);
  args.push(...DEFAULT_SCOPES.flatMap((scope) => ['--allow', scope]), '--committed-only');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'context-read-followup-evaluation', version: '0.1.0' });
  await client.connect(transport);
  const listed = await client.listTools();
  const tools = listed.tools.map((tool) => tool.name).sort();
  if (!tools.includes('context_lookup') || !tools.includes('context_read')) {
    throw new Error('fresh MCP server is missing required context tools');
  }
  return {
    call: (name, args) => client.request({ method: 'tools/call', params: { name, arguments: args } }, CallToolResultSchema),
    tools,
    close: async () => {
      await client.close();
      await transport.close();
    },
  };
}

async function assembleUnit(call, unit, totals) {
  const text = [];
  const errors = [];
  let offset = 0;
  let pages = 0;
  let calls = 0;
  let readBytes = 0;
  let totalBytes = null;
  let complete = false;
  while (pages < MAX_PAGES_PER_UNIT && totals.read_bytes < MAX_TOTAL_READ_BYTES) {
    const available = Math.min(READ_PAGE_MAX_BYTES, MAX_TOTAL_READ_BYTES - totals.read_bytes);
    const response = await call('context_read', { ...readIdentity(unit), offset_bytes: offset, max_bytes: available });
    totals.read_calls += 1;
    calls += 1;
    const receivedBytes = outputBytes(response?.structuredContent ?? {});
    totals.read_bytes += receivedBytes;
    readBytes += receivedBytes;
    const validationErrors = responseErrors(response, available);
    const error = protocolError(response);
    if (error) {
      errors.push(...validationErrors, error);
      break;
    }
    const page = response.structuredContent;
    pages += 1;
    errors.push(...validationErrors);
    if (errors.length > 0) break;
    if (page.evidence_unit?.id !== unit.id || page.evidence_unit?.source_revision !== unit.source_revision
      || page.evidence_unit?.content_hash !== unit.content_hash || page.evidence_unit?.source_uri !== unit.source_uri
      || stableJson(page.evidence_unit?.anchor) !== stableJson(unit.anchor) || page.pagination?.offset_bytes !== offset
      || page.index_sync?.[0]?.revision !== snapshot.manifest.revision) {
      errors.push({ code: 'read_identity_mismatch' });
      break;
    }
    if (totalBytes === null) totalBytes = page.pagination?.total_bytes;
    else if (page.pagination?.total_bytes !== totalBytes) {
      errors.push({ code: 'read_total_bytes_changed' });
      break;
    }
    if (!Number.isSafeInteger(totalBytes) || totalBytes < 0) {
      errors.push({ code: 'invalid_read_total_bytes' });
      break;
    }
    text.push(page.evidence_unit.excerpt);
    if (page.pagination.complete) {
      if (page.pagination.next_offset_bytes !== null) errors.push({ code: 'invalid_terminal_cursor' });
      if (Buffer.byteLength(text.join(''), 'utf8') !== totalBytes) errors.push({ code: 'assembled_length_mismatch' });
      complete = errors.length === 0;
      break;
    }
    const expectedOffset = offset + Buffer.byteLength(page.evidence_unit.excerpt, 'utf8');
    if (!Number.isSafeInteger(page.pagination.next_offset_bytes) || page.pagination.next_offset_bytes !== expectedOffset
      || expectedOffset <= offset || expectedOffset >= totalBytes) {
      errors.push({ code: 'invalid_read_cursor' });
      break;
    }
    offset = page.pagination.next_offset_bytes;
  }
  if (!complete && errors.length === 0) {
    errors.push({ code: totals.read_bytes >= MAX_TOTAL_READ_BYTES ? 'total_read_cap_reached' : 'page_cap_reached' });
  }
  const excerpt = text.join('');
  if (complete && `sha256:${sha256(excerpt)}` !== unit.content_hash) {
    errors.push({ code: 'assembled_hash_mismatch' });
    complete = false;
  }
  return { unit: { ...unit, excerpt, truncated: !complete }, complete, pages, calls, read_bytes: readBytes, errors };
}

async function evaluate(call, sample, totals) {
  const started = performance.now();
  const response = await call('context_lookup', {
    query: sample.query,
    scope: sample.scope,
    max_bytes: sample.max_bytes,
  });
  totals.lookup_calls += 1;
  const lookupBytes = outputBytes(response?.structuredContent ?? {});
  totals.lookup_bytes += lookupBytes;
  const validationErrors = responseErrors(response, sample.max_bytes);
  const error = protocolError(response);
  if (error) return {
    id: sample.id,
    query: sample.query,
    scope: sample.scope,
    max_bytes: sample.max_bytes,
    lookup: { bytes: lookupBytes },
    elapsed_ms: Math.round(performance.now() - started),
    incomplete: true,
    errors: [...validationErrors, error],
  };
  const lookup = response.structuredContent;
  const errors = validationErrors;
  if (!lookup.index_sync?.length || !lookup.index_sync.every((entry) => entry.revision === snapshot.manifest.revision)
    || !lookup.evidence_units?.every((unit) => unit.source_revision === snapshot.manifest.revision)) {
    errors.push({ code: 'lookup_snapshot_mismatch' });
  }
  if (errors.length > 0) {
    return {
      id: sample.id,
      query: sample.query,
      scope: sample.scope,
      max_bytes: sample.max_bytes,
      lookup: { bytes: lookupBytes, index_status: lookup.index_sync?.[0]?.status },
      incomplete: true,
      errors,
      elapsed_ms: Math.round(performance.now() - started),
    };
  }
  const replacements = new Map();
  const truncated = lookup.evidence_units.filter((unit) => unit.truncated);
  for (const unit of truncated) {
    const assembled = await assembleUnit(call, unit, totals);
    replacements.set(unit.id, assembled);
    if (!assembled.complete) errors.push(...assembled.errors);
  }
  const assembledUnits = lookup.evidence_units.map((unit) => replacements.get(unit.id)?.unit ?? unit);
  const before = scoreResult(sample, lookup);
  const after = scoreResult(sample, { ...lookup, evidence_units: assembledUnits });
  return {
    id: sample.id,
    query: sample.query,
    scope: sample.scope,
    max_bytes: sample.max_bytes,
    lookup: {
      bytes: lookupBytes,
      result_status: lookup.result_status,
      index_status: lookup.index_sync[0]?.status,
      evidence_units_returned: lookup.evidence_units.length,
      truncated_evidence_units: truncated.length,
      relations_returned: lookup.relations.length,
      budget_exhausted: lookup.budget.exhausted,
      traversal_limit_reached: lookup.traversal.limit_reached,
    },
    reads: {
      units_requested: truncated.length,
      units_complete: [...replacements.values()].filter((item) => item.complete).length,
      calls: [...replacements.values()].reduce((sum, item) => sum + item.calls, 0),
      total_read_bytes: [...replacements.values()].reduce((sum, item) => sum + item.read_bytes, 0),
      units: [...replacements.entries()].map(([id, item]) => ({ id, complete: item.complete, pages: item.pages, errors: item.errors })),
    },
    before,
    after,
    after_truncated_evidence_units: assembledUnits.filter((unit) => unit.truncated).length,
    incomplete: errors.length > 0,
    errors,
    elapsed_ms: Math.round(performance.now() - started),
  };
}

const started = performance.now();
const totals = { lookup_calls: 0, lookup_bytes: 0, read_calls: 0, read_bytes: 0 };
const connection = await connect();
let results;
try {
  results = [];
  for (const sample of cases) results.push(await evaluate(connection.call, sample, totals));
} finally {
  await connection.close();
}
const completeResults = results.filter((result) => result.before && result.after);
const report = {
  observed_at: new Date().toISOString(),
  source_revision: snapshot.manifest.revision,
  fingerprint: snapshot.fingerprint,
  hashes: {
    query_code_hash: sha256(readFileSync(new URL('../src/query.mjs', import.meta.url))),
    read_code_hash: sha256(readFileSync(new URL('../src/read-evidence.mjs', import.meta.url))),
    server_code_hash: sha256(readFileSync(new URL('../src/server.mjs', import.meta.url))),
    cli_code_hash: sha256(readFileSync(cliUrl)),
    score_code_hash: sha256(readFileSync(new URL('./score.mjs', import.meta.url))),
    harness_code_hash: sha256(readFileSync(harnessUrl)),
    cases_hash: sha256(caseBytes),
  },
  limits: {
    max_pages_per_unit: MAX_PAGES_PER_UNIT,
    total_read_bytes_cap: MAX_TOTAL_READ_BYTES,
    read_page_max_bytes: READ_PAGE_MAX_BYTES,
  },
  policy: {
    reads_all_truncated_lookup_units: true,
    assembled_scoring_is_not_one_mcp_response: true,
    byte_metrics_exclude_mcp_envelope: true,
  },
  mcp_tools: connection.tools,
  totals: {
    ...totals,
    elapsed_ms: Math.round(performance.now() - started),
    truncated_evidence_units: results.reduce((sum, result) => sum + (result.lookup?.truncated_evidence_units ?? 0), 0),
    incomplete_cases: results.filter((result) => result.incomplete).map((result) => result.id),
  },
  before: summarize(completeResults.map((result) => result.before)),
  after: summarize(completeResults.map((result) => result.after)),
  failed_followup_cases: completeResults.filter((result) => !result.after.passed).map((result) => result.id),
  cases: results,
};
console.log(JSON.stringify(report, null, 2));
if (values.check && (report.totals.incomplete_cases.length > 0 || report.failed_followup_cases.length > 0)) process.exitCode = 1;
