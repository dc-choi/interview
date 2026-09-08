import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { cpus, platform, arch, tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { DEFAULT_SCOPES, sha256 } from '../src/core.mjs';
import { loadSnapshot } from '../src/snapshot.mjs';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const queryFile = join(repo, 'ontology/src/query.mjs');
const supportFiles = ['core.mjs', 'repository.mjs', 'snapshot.mjs', 'markdown.mjs'];
const { values } = parseArgs({ options: {
  'baseline-query': { type: 'string' },
  cases: { type: 'string', multiple: true },
  rounds: { type: 'string', default: '3' },
  output: { type: 'string' },
} });
const rounds = Number(values.rounds);
assert.ok(values['baseline-query'] && values.cases?.length && values.output,
  'Require --baseline-query, --cases (repeatable), and --output');
assert.ok(Number.isSafeInteger(rounds) && rounds >= 3 && rounds <= 20, 'rounds must be 3..20');
const baselineSource = readFileSync(resolve(values['baseline-query']));
const caseFiles = values.cases.map((file) => resolve(file));
const trackedFiles = [fileURLToPath(import.meta.url), queryFile,
  ...supportFiles.map((file) => join(repo, 'ontology/src', file)), ...caseFiles];
const hashes = Object.fromEntries(trackedFiles.map((file) => [relative(repo, file), sha256(readFileSync(file))]));
const cases = caseFiles.flatMap((file) => JSON.parse(readFileSync(file, 'utf8')));
const ids = new Set();
const requests = cases.map((sample) => {
  assert.ok(sample.id && !ids.has(sample.id) && typeof sample.query === 'string', 'Invalid or duplicate case');
  ids.add(sample.id);
  return { id: sample.id, mode: 'lookup', args: {
    query: sample.query, scope: sample.scope ?? ['tech'], max_bytes: sample.max_bytes ?? 24000,
  } };
});
// Cover both entry points; cursor continuation contracts also have fixture tests.
for (const scope of ['tech', 'biz', 'econ', 'fit', 'ontology']) {
  const sample = requests.find((entry) => entry.args.scope.includes(scope));
  requests.push({ id: `search-${scope}`, mode: 'search', args: sample?.args
    ?? { query: 'ontology', scope: [scope], max_bytes: 24000 } });
}
const options = { repo, allowlist: DEFAULT_SCOPES };
const snapshot = loadSnapshot(options);
const snapshotIdentity = (item) => ({
  revision: item.manifest.revision, fingerprint: item.fingerprint, manifest_hash: item.manifest_hash,
});
const frozenSnapshot = snapshotIdentity(snapshot);
const directory = mkdtempSync(join(tmpdir(), 'ontology-performance-'));

function measure(api, request) {
  const started = performance.now();
  const result = api[request.mode](options, request.args, snapshot);
  const elapsed = performance.now() - started;
  const bytes = Buffer.byteLength(JSON.stringify(result));
  assert.equal(bytes, result.budget.used_bytes, request.id);
  assert.ok(bytes <= result.budget.effective_max_bytes, request.id);
  // Each code version intentionally binds its own search cursors. Compare the
  // decoded offset and every other response field, including actual byte count.
  const cursor = result.pagination?.next_cursor;
  if (cursor) {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    assert.deepEqual(Object.keys(decoded).sort(), ['binding', 'offset']);
    assert.match(decoded.binding, /^[a-f0-9]{64}$/);
    result.pagination.next_cursor = { ...decoded, binding: '<code-bound>' };
  }
  return { elapsed_ms: elapsed, bytes, response_sha256: sha256(JSON.stringify(result)) };
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (ratio) => sorted[Math.floor((sorted.length - 1) * ratio)];
  return { calls: samples.length, p50_ms: percentile(0.5), p95_ms: percentile(0.95) };
}

try {
  writeFileSync(join(directory, 'query.mjs'), baselineSource);
  for (const file of supportFiles) symlinkSync(join(repo, 'ontology/src', file), join(directory, file));
  const baseline = await import(pathToFileURL(join(directory, 'query.mjs')).href);
  const current = await import(pathToFileURL(queryFile).href);
  const rows = requests.map((request) => ({ ...request, baseline: [], current: [] }));
  // One unmeasured pass per version warms module/JIT and filesystem paths.
  for (const request of requests.slice(0, 3)) {
    assert.equal(measure(baseline, request).response_sha256, measure(current, request).response_sha256, request.id);
  }
  for (let round = 0; round < rounds; round += 1) {
    for (const [index, row] of rows.entries()) {
      const order = (round + index) % 2 ? ['current', 'baseline'] : ['baseline', 'current'];
      const measured = {};
      for (const name of order) measured[name] = measure(name === 'baseline' ? baseline : current, row);
      assert.equal(measured.baseline.response_sha256, measured.current.response_sha256, `${row.id}, round ${round}`);
      if (row.response_sha256) assert.equal(measured.current.response_sha256, row.response_sha256, row.id);
      row.response_sha256 = measured.current.response_sha256;
      row.bytes = measured.current.bytes;
      row.baseline.push(measured.baseline.elapsed_ms);
      row.current.push(measured.current.elapsed_ms);
    }
    process.stderr.write(`Completed round ${round + 1}/${rounds}: ${rows.length} equivalent response pairs\n`);
  }
  for (const [file, hash] of Object.entries(hashes)) assert.equal(sha256(readFileSync(join(repo, file))), hash, file);
  assert.deepEqual(snapshotIdentity(loadSnapshot(options)), frozenSnapshot, 'Snapshot changed during measurement');
  const summaries = Object.fromEntries(['lookup', 'search'].map((mode) => {
    const selected = rows.filter((row) => row.mode === mode);
    return [mode, Object.fromEntries(['baseline', 'current'].map((name) =>
      [name, summarize(selected.flatMap((row) => row[name]))]))];
  }));
  const report = {
    observed_at: new Date().toISOString(),
    contract: {
      timed: 'Synchronous lookup/search with a preloaded verified snapshot, including Git source reads and response packing.',
      excluded: 'Snapshot loading, MCP transport, host reasoning, scoring, and response equality checks.',
      order: 'Alternate version order by request and round, following three unmeasured request pairs.',
      equality: 'Entire lookup JSON; search JSON except the code-bound cursor binding. Actual byte budgets checked on every call.',
      scope: 'Previously observed synthetic regression requests; no new retrieval quality claim or load-test claim.',
      percentile: 'Sorted samples at floor((N - 1) * q).',
    },
    environment: { node: process.version, platform: platform(), arch: arch(), cpu: cpus()[0]?.model },
    inputs: { snapshot: frozenSnapshot, code_and_case_hashes: hashes,
      baseline_query_sha256: sha256(baselineSource), baseline_query_source: baselineSource.toString('utf8') },
    rounds, equivalent_response_pairs: rows.length * rounds, summaries, requests: rows,
  };
  writeFileSync(resolve(values.output), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ equivalent_response_pairs: report.equivalent_response_pairs, summaries }, null, 2)}\n`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
