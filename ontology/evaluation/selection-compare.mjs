import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { DEFAULT_SCOPES, sha256, stableJson } from '../src/core.mjs';
import { loadSnapshot } from '../src/snapshot.mjs';
import { prepareCases, scoreResult } from './score.mjs';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const queryFile = join(repo, 'ontology/src/query.mjs');
const scoreFile = fileURLToPath(new URL('./score.mjs', import.meta.url));
const supportFiles = ['core.mjs', 'repository.mjs', 'snapshot.mjs', 'markdown.mjs'];
const defaultCases = [
  'ontology/evaluation/cases.json', 'ontology/evaluation/validation-cases.json',
  'ontology/evaluation/holdout-cases.json', 'ontology/evaluation/generalization-cases-2026-09-07.json',
  'ontology/evaluation/context-integrity-cases.json', 'ontology/evaluation/document-search-cases-2026-09-08.json',
  'ontology/evaluation/metadata-ranking-cases-2026-09-08.json', 'ontology/evaluation/graph-ranking-cases-2026-09-08.json',
  'ontology/evaluation/diagnostic-cases.json', 'ontology/evaluation/context-packing-cases-2026-09-08.json',
  'ontology/evaluation/algorithm-holdout-cases-2026-09-08.json',
];
const { values } = parseArgs({ options: {
  cases: { type: 'string', multiple: true },
  'baseline-query': { type: 'string' },
  'expected-baseline-query-hash': { type: 'string' },
  'expected-current-query-hash': { type: 'string' },
  'expected-cases-hash': { type: 'string' },
  'expected-revision': { type: 'string' },
  'expected-fingerprint': { type: 'string' },
  output: { type: 'string' },
} });

function expected(name, pattern) {
  const value = values[name];
  if (typeof value !== 'string' || !pattern.test(value)) throw new Error(`Missing or invalid --${name}`);
  return value;
}

function hashFile(file) {
  return sha256(readFileSync(file));
}

function assertHash(name, actual, wanted) {
  if (actual !== wanted) throw new Error(`${name} changed or does not match the requested frozen hash`);
}

function output(result) {
  const bytes = `${JSON.stringify(result, null, 2)}\n`;
  if (values.output) writeFileSync(resolve(repo, values.output), bytes);
  else process.stdout.write(bytes);
}

function percentile(samples, ratio) {
  const values = samples.map((sample) => sample.elapsed_ms).sort((a, b) => a - b);
  return values[Math.floor((values.length - 1) * ratio)];
}

function summarize(samples) {
  const positives = samples.filter((sample) => !sample.expected_empty);
  const groups = samples.filter((sample) => sample.evidence_groups_total !== null);
  const total = groups.reduce((sum, sample) => sum + sample.evidence_groups_total, 0);
  const hit = groups.reduce((sum, sample) => sum + sample.evidence_groups_hit, 0);
  return {
    cases: samples.length,
    positive_cases: positives.length,
    passed_cases: samples.filter((sample) => sample.passed).length,
    document_hits: samples.filter((sample) => sample.document_hit).length,
    heading_hits: samples.filter((sample) => sample.heading_hit).length,
    evidence_hits: samples.filter((sample) => sample.evidence_hit).length,
    evidence_groups_total: total,
    evidence_groups_hit: hit,
    evidence_recall: total ? hit / total : null,
    body_asserted_cases: samples.filter((sample) => sample.body_hit !== null).length,
    body_hits: samples.filter((sample) => sample.body_hit).length,
    failed_cases: samples.filter((sample) => !sample.passed).map((sample) => sample.id),
    latency_ms: { p50: percentile(samples, 0.5), p95: percentile(samples, 0.95) },
  };
}

function measure(lookup, sample, snapshot) {
  const started = performance.now();
  const result = lookup({ repo, allowlist: DEFAULT_SCOPES }, {
    query: sample.query, scope: sample.scope, max_bytes: sample.max_bytes,
  }, snapshot);
  const bytes = Buffer.byteLength(JSON.stringify(result));
  if (bytes !== result.budget.used_bytes || bytes > result.budget.effective_max_bytes) {
    throw new Error(`Invalid output budget in ${sample.id}`);
  }
  return {
    ...scoreResult(sample, result),
    elapsed_ms: Math.round(performance.now() - started),
    bytes,
    result_status: result.result_status,
    index_status: result.index_sync[0].status,
    entities_returned: result.entities.length,
    relations_returned: result.relations.length,
    evidence_units_returned: result.evidence_units.length,
    truncated_evidence_units: result.evidence_units.filter((unit) => unit.truncated).length,
    budget_exhausted: result.budget.exhausted,
    traversal_limit_reached: result.traversal.limit_reached,
    returned_paths: [...new Set(result.evidence_units.map((unit) => unit.source_uri))],
    returned_evidence: result.evidence_units.map((unit) => ({
      id: unit.id,
      source_uri: unit.source_uri,
      heading_path: unit.anchor?.heading_path ?? [],
      truncated: unit.truncated,
      excerpt_sha256: sha256(unit.excerpt),
    })),
  };
}

async function loadFrozenLookup(bytes) {
  const directory = mkdtempSync(join(tmpdir(), 'ontology-selection-'));
  try {
    const file = join(directory, 'query.mjs');
    writeFileSync(file, bytes, { mode: 0o600 });
    for (const name of supportFiles) symlinkSync(join(repo, 'ontology/src', name), join(directory, name));
    const { lookup } = await import(pathToFileURL(file).href);
    return { lookup, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

const baselineHash = expected('expected-baseline-query-hash', /^[a-f0-9]{64}$/);
const currentHash = expected('expected-current-query-hash', /^[a-f0-9]{64}$/);
const casesHash = expected('expected-cases-hash', /^[a-f0-9]{64}$/);
const revision = expected('expected-revision', /^[a-f0-9]{40,64}$/);
const fingerprint = expected('expected-fingerprint', /^[a-f0-9]{64}$/);
if (!values['baseline-query']) throw new Error('Missing --baseline-query');
const caseFiles = (values.cases ?? defaultCases).map((file) => resolve(repo, file));
const caseFileHashes = Object.fromEntries(caseFiles.map((file) => [relative(repo, file), hashFile(file)]));
const rawCases = caseFiles.flatMap((file) => JSON.parse(readFileSync(file, 'utf8')));
assertHash('case input', sha256(Buffer.from(stableJson(rawCases))), casesHash);
const baselineSource = readFileSync(resolve(repo, values['baseline-query']));
assertHash('baseline query', sha256(baselineSource), baselineHash);
assertHash('current query', hashFile(queryFile), currentHash);
const codeHashes = Object.fromEntries([
  ['selection_compare', hashFile(fileURLToPath(import.meta.url))],
  ['score', hashFile(scoreFile)],
  ['current_query', currentHash],
  ...supportFiles.map((file) => [file, hashFile(join(repo, 'ontology/src', file))]),
]);
const snapshot = loadSnapshot({ repo, allowlist: DEFAULT_SCOPES });
if (snapshot.manifest.revision !== revision || snapshot.fingerprint !== fingerprint) {
  throw new Error('Snapshot revision or fingerprint does not match the requested frozen input');
}
const cases = prepareCases(rawCases, snapshot, repo);
const caseFileForId = new Map();
for (const file of caseFiles) for (const sample of JSON.parse(readFileSync(file, 'utf8'))) {
  caseFileForId.set(sample.id, relative(repo, file));
}
const frozen = await loadFrozenLookup(baselineSource);
let report;
try {
  const { lookup: currentLookup } = await import(pathToFileURL(queryFile).href);
  const rows = cases.map((sample, index) => {
    const first = index % 2 ? currentLookup : frozen.lookup;
    const second = index % 2 ? frozen.lookup : currentLookup;
    const firstResult = measure(first, sample, snapshot);
    const secondResult = measure(second, sample, snapshot);
    const baseline = first === frozen.lookup ? firstResult : secondResult;
    const current = first === currentLookup ? firstResult : secondResult;
    return {
      id: sample.id,
      case_file: caseFileForId.get(sample.id),
      query: sample.query,
      scope: sample.scope,
      max_bytes: sample.max_bytes,
      expected_empty: Boolean(sample.expected_empty),
      ...(sample.expected_evidence ? { expected_evidence: sample.expected_evidence }
        : { expected_evidence_groups: sample.expected_evidence_groups }),
      baseline,
      current,
    };
  });
  const baselineResults = rows.map((row) => ({ id: row.id, ...row.baseline, expected_empty: row.expected_empty }));
  const currentResults = rows.map((row) => ({ id: row.id, ...row.current, expected_empty: row.expected_empty }));
  const select = (items, variant) => items.map((row) => ({ id: row.id, ...row[variant], expected_empty: row.expected_empty }));
  report = {
    observed_at: new Date().toISOString(),
    contract: {
      scorer: 'ontology/evaluation/score.mjs',
      positive_pass: 'Every required evidence group must match one allowed source, heading and body target in the returned response.',
      negative_pass: 'The response must be insufficient_evidence with no entities, relations or evidence units.',
      budget: 'Every baseline and current response is checked against its serialized byte budget.',
    },
    inputs: {
      source_revision: snapshot.manifest.revision,
      fingerprint: snapshot.fingerprint,
      case_files: caseFileHashes,
      cases_sha256: casesHash,
      code_hashes: { ...codeHashes, baseline_query: baselineHash },
      baseline_query_source: baselineSource.toString('utf8'),
    },
    baseline: summarize(baselineResults),
    current: summarize(currentResults),
    delta: {
      passed_cases: currentResults.filter((sample) => sample.passed).length - baselineResults.filter((sample) => sample.passed).length,
      evidence_groups_hit: currentResults.reduce((sum, sample) => sum + (sample.evidence_groups_hit ?? 0), 0)
        - baselineResults.reduce((sum, sample) => sum + (sample.evidence_groups_hit ?? 0), 0),
      body_hits: currentResults.filter((sample) => sample.body_hit).length - baselineResults.filter((sample) => sample.body_hit).length,
    },
    case_file_summaries: Object.fromEntries(caseFiles.map((file) => {
      const fileRows = rows.filter((row) => row.case_file === relative(repo, file));
      return [relative(repo, file), { baseline: summarize(select(fileRows, 'baseline')), current: summarize(select(fileRows, 'current')) }];
    })),
    gains: rows.filter((row) => row.current.passed && !row.baseline.passed).map((row) => row.id),
    pass_regressions: rows.filter((row) => !row.current.passed && row.baseline.passed).map((row) => row.id),
    evidence_group_regressions: rows.filter((row) => row.current.evidence_groups_hit < row.baseline.evidence_groups_hit)
      .map((row) => ({ id: row.id, baseline: row.baseline.evidence_groups_hit, current: row.current.evidence_groups_hit })),
    cases: rows,
  };
} finally {
  frozen.cleanup();
}
assertHash('current query after evaluation', hashFile(queryFile), currentHash);
for (const [file, hash] of Object.entries(caseFileHashes)) {
  assertHash(`${file} after evaluation`, hashFile(join(repo, file)), hash);
}
assertHash('case input after evaluation', sha256(Buffer.from(stableJson(caseFiles.flatMap((file) => JSON.parse(readFileSync(file, 'utf8')))))), casesHash);
assertHash('score after evaluation', hashFile(scoreFile), codeHashes.score);
assertHash('selection compare after evaluation', hashFile(fileURLToPath(import.meta.url)), codeHashes.selection_compare);
for (const file of supportFiles) assertHash(`${file} after evaluation`, hashFile(join(repo, 'ontology/src', file)), codeHashes[file]);
output(report);
