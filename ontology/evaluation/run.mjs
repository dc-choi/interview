import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { sha256 } from '../src/core.mjs';
import { lookup } from '../src/query.mjs';
import { loadSnapshot } from '../src/snapshot.mjs';

// An observational retrieval check, separate from the runtime contract tests.
const { values } = parseArgs({ options: { cache: { type: 'string' } } });
const options = {
  repo: fileURLToPath(new URL('../..', import.meta.url)),
  cacheDir: values.cache,
  allowlist: ['tech'],
};
const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url)));
const snapshot = loadSnapshot(options);
const results = [];
for (const sample of cases) {
  const started = performance.now();
  const result = lookup(options, { query: sample.query, scope: ['tech'], max_bytes: 24000 }, snapshot);
  const bytes = Buffer.byteLength(JSON.stringify(result));
  if (bytes !== result.budget.used_bytes || bytes > result.budget.effective_max_bytes) {
    throw new Error(`Invalid output budget in ${sample.id}`);
  }
  results.push({
    ...sample,
    gold_in_snapshot: snapshot.entities.some((entity) => entity.source_uri === sample.expected_path
      && entity.anchor?.heading_path?.at(-1) === sample.expected_heading),
    document_hit: result.evidence_units.some((unit) => unit.source_uri === sample.expected_path),
    heading_hit: result.evidence_units.some((unit) => unit.source_uri === sample.expected_path
      && unit.anchor.heading_path.at(-1) === sample.expected_heading),
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
  document_hits: results.filter((result) => result.document_hit).length,
  heading_hits: results.filter((result) => result.heading_hit).length,
  cases: results,
}, null, 2));
