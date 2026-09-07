import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { DEFAULT_SCOPES, sha256 } from '../src/core.mjs';
import { lookup } from '../src/query.mjs';
import { loadSnapshot } from '../src/snapshot.mjs';
import { prepareCases, scoreResult } from './score.mjs';

// An observational retrieval check, separate from the runtime contract tests.
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
const caseBytes = readFileSync(values.cases ?? new URL('./cases.json', import.meta.url));
const snapshot = loadSnapshot(options);
const cases = prepareCases(JSON.parse(caseBytes), snapshot, options.repo);
const results = [];
for (const sample of cases) {
  const started = performance.now();
  const result = lookup(options, { query: sample.query, scope: sample.scope, max_bytes: sample.max_bytes }, snapshot);
  const bytes = Buffer.byteLength(JSON.stringify(result));
  if (bytes !== result.budget.used_bytes || bytes > result.budget.effective_max_bytes) {
    throw new Error(`Invalid output budget in ${sample.id}`);
  }
  results.push({
    ...sample,
    ...scoreResult(sample, result),
    elapsed_ms: Math.round(performance.now() - started),
    bytes,
    result_status: result.result_status,
    index_status: result.index_sync[0].status,
    relations_returned: result.relations.length,
    budget_exhausted: result.budget.exhausted,
    traversal_limit_reached: result.traversal.limit_reached,
    returned_paths: [...new Set(result.evidence_units.map((unit) => unit.source_uri))],
  });
}
console.log(JSON.stringify({
  observed_at: new Date().toISOString(),
  source_revision: snapshot.manifest.revision,
  fingerprint: snapshot.fingerprint,
  query_code_hash: sha256(readFileSync(new URL('../src/query.mjs', import.meta.url))),
  evaluator_hash: sha256(Buffer.concat([
    readFileSync(new URL('./run.mjs', import.meta.url)),
    readFileSync(new URL('./score.mjs', import.meta.url)),
  ])),
  cases_hash: sha256(caseBytes),
  positive_cases: cases.filter((sample) => !sample.expected_empty).length,
  document_hits: results.filter((result) => result.document_hit).length,
  heading_hits: results.filter((result) => result.heading_hit).length,
  evidence_hits: results.filter((result) => result.evidence_hit).length,
  body_asserted_cases: results.filter((result) => result.body_hit !== null).length,
  body_hits: results.filter((result) => result.body_hit).length,
  passed_cases: results.filter((result) => result.passed).length,
  failed_cases: results.filter((result) => !result.passed).map((result) => result.id),
  cases: results,
}, null, 2));
if (values.check && results.some((result) => !result.passed)) process.exitCode = 1;
