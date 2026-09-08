import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { DEFAULT_SCOPES, sha256 } from '../../src/core.mjs';
import { loadSnapshot } from '../../src/snapshot.mjs';
import { lookup as productionLookup } from '../../src/query.mjs';
import { prepareCases, scoreResult } from '../score.mjs';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  data: { type: 'string' }, cases: { type: 'string', multiple: true },
  scores: { type: 'string' }, output: { type: 'string' }, model: { type: 'string' },
  'expected-frozen-hash': { type: 'string' }, 'expected-scores-hash': { type: 'string' },
} });
if (!values.data || !['prepare', 'evaluate'].includes(positionals[0])) {
  throw new Error('Usage: node run.mjs prepare|evaluate --data PREFIX [--cases FILE] [--scores FILE --output FILE]');
}
const prefix = path.resolve(values.data);
const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const hash = (file) => {
  const digest = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    let bytes;
    while ((bytes = fs.readSync(fd, buffer)) > 0) digest.update(buffer.subarray(0, bytes));
    return digest.digest('hex');
  } finally { fs.closeSync(fd); }
};
const queryFile = new URL('../../src/query.mjs', import.meta.url);
const code = fs.readFileSync(queryFile, 'utf8');
const options = { repo, allowlist: DEFAULT_SCOPES };
const snapshot = loadSnapshot(options);
const codeHashes = () => Object.fromEntries(['../../src/query.mjs', '../../src/core.mjs',
  '../../src/repository.mjs', '../../src/snapshot.mjs', '../../src/markdown.mjs', '../score.mjs', 'run.mjs', 'score.py', 'download-model.py']
  .map((name) => [name, hash(new URL(name, import.meta.url))]));
const replace = (text, marker, insertion) => {
  if (text.split(marker).length !== 2) throw new Error('Replay source marker changed');
  return text.replace(marker, insertion + '\n' + marker);
};
// ponytail: checked replay markers keep an unproven model out of the runtime API.
let replay = replace(code, '  const roots = [...scored.values()].sort', `
  const pool = searchableSections.filter((s) => s.type === 'Section' && s.anchor.heading_path.length > 0
    && scored.has(documentIdFor(s, documentsByPath)) && (sectionScores.get(s.id) ?? 0) > 0)
    .sort((a, b) => (sectionScores.get(b.id) ?? 0) - (sectionScores.get(a.id) ?? 0) || a.id.localeCompare(b.id)).slice(0, 50);
  options.observePool?.({ exact: hasExactMetadataHit, candidates: pool.map((s) => {
    const raw = read(sourcePath(s)).subarray(s.anchor.start_byte, s.anchor.end_byte);
    if (sha256(raw) !== s.content_hash.replace(/^sha256:/, '')) throw new Error('Candidate source hash mismatch');
    return { id: s.id, score: sectionScores.get(s.id), excerpt: raw.toString('utf8'),
      text: documentsByPath.get(sourcePath(s)).label + '\\n' + s.anchor.heading_path.join(' > ') + '\\n' + raw.toString('utf8') };
  }) });
  if (options.ranking && !hasExactMetadataHit) {
    const poolIds = new Set(pool.map((s) => s.id));
    if (options.ranking.length !== poolIds.size || new Set(options.ranking.map((s) => s.id)).size !== poolIds.size
      || options.ranking.some((s) => !poolIds.has(s.id) || !Number.isFinite(s.score))) throw new Error('Ranking must cover the exact candidate pool');
    scored.clear();
    for (let i = 0; i < options.ranking.length; i += 1) {
      const section = sectionsById.get(options.ranking[i].id);
      const doc = documentsByPath.get(sourcePath(section));
      // A positive ordinal preserves order without mixing uncalibrated logits with lexical scores.
      const score = 1000000 - i;
      sectionScores.set(section.id, score);
      if (!scored.has(doc.id)) scored.set(doc.id, { doc, direct: section, score,
        metadataMatch: false, matchedTokens: new Set(sectionTerms.get(section.id)) });
    }
  }
`);
replay = replay.replaceAll("from './", `from '${new URL('../../src/', import.meta.url).href}`);
fs.mkdirSync(path.dirname(prefix), { recursive: true });
fs.writeFileSync(prefix + '-replay.mjs', replay);
const { lookup } = await import(pathToFileURL(prefix + '-replay.mjs'));
const args = (sample) => ({ query: sample.query, scope: sample.scope, max_bytes: sample.max_bytes });
const measure = (sample, result) => {
  const bytes = Buffer.byteLength(JSON.stringify(result));
  if (bytes !== result.budget.used_bytes || bytes > sample.max_bytes) throw new Error('Invalid byte accounting');
  return { ...scoreResult(sample, result), bytes, result_status: result.result_status,
    returned_evidence: result.evidence_units.map((unit) => ({ id: unit.id, source_uri: unit.source_uri,
      heading_path: unit.anchor.heading_path, truncated: unit.truncated, excerpt_sha256: sha256(unit.excerpt) })) };
};

if (positionals[0] === 'prepare') {
  const names = values.cases ?? ['cases.json', 'validation-cases.json', 'holdout-cases.json',
    'generalization-cases-2026-09-07.json', 'context-integrity-cases.json',
    'document-search-cases-2026-09-08.json', 'metadata-ranking-cases-2026-09-08.json',
    'graph-ranking-cases-2026-09-08.json', 'diagnostic-cases.json', 'context-packing-cases-2026-09-08.json',
    'algorithm-holdout-cases-2026-09-08.json', 'selection-holdout-cases-2026-09-08.json'];
  const files = names.map((name) => path.isAbsolute(name) ? name : fileURLToPath(new URL('../' + name, import.meta.url)));
  const caseBytes = files.map((file) => fs.readFileSync(file));
  const cases = prepareCases(caseBytes.flatMap((bytes, i) => JSON.parse(bytes).map((sample) => ({ ...sample, suite: path.basename(files[i]) }))), snapshot, repo);
  const frozen = { revision: snapshot.manifest.revision, fingerprint: snapshot.fingerprint,
    query_source: code, code_hashes: codeHashes(), case_hashes: Object.fromEntries(files.map((file, i) => [file, sha256(caseBytes[i])])),
    cases, observations: [] };
  if (frozen.code_hashes['../../src/query.mjs'] !== sha256(code)) throw new Error('Query changed during preparation');
  const byId = new Map(snapshot.entities.map((entity) => [entity.id, entity]));
  const queries = [];
  for (const sample of cases) {
    let pool;
    const result = lookup({ ...options, observePool: (value) => { pool = value; } }, args(sample), snapshot);
    const start = performance.now();
    const original = productionLookup(options, args(sample), snapshot);
    const baseline_ms = performance.now() - start;
    if (JSON.stringify(result) !== JSON.stringify(original)) throw new Error('Observer changed production output');
    pool ??= { exact: false, candidates: [] };
    queries.push({ id: sample.id, query: sample.query,
      candidates: pool.exact ? [] : pool.candidates.map(({ id, text }) => ({ id, text })) });
    frozen.observations.push({ id: sample.id, exact: pool.exact, baseline_ms,
      baseline: measure(sample, result),
      candidates: pool.candidates.map(({ id, score }) => ({ id, score })),
      candidate_coverage: scoreResult(sample, { ...result,
        evidence_units: pool.candidates.map(({ id, excerpt }) => ({ ...byId.get(id), excerpt })) }) });
    if (queries.length % 10 === 0) console.error(JSON.stringify({ prepared: queries.length, total: cases.length }));
  }
  if (JSON.stringify(frozen.code_hashes) !== JSON.stringify(codeHashes())
    || Object.entries(frozen.case_hashes).some(([file, wanted]) => hash(file) !== wanted)) throw new Error('Inputs changed during preparation');
  write(prefix + '-input.json', { queries });
  frozen.input_sha256 = hash(prefix + '-input.json');
  write(prefix + '-frozen.json', frozen);
  console.log(JSON.stringify({ prepared: cases.length, input_sha256: frozen.input_sha256,
    frozen_sha256: hash(prefix + '-frozen.json') }));
} else {
  if (!values.scores || !values.output || !values.model
    || !/^[a-f0-9]{64}$/.test(values['expected-frozen-hash'] ?? '')
    || !/^[a-f0-9]{64}$/.test(values['expected-scores-hash'] ?? '')) {
    throw new Error('evaluate requires --scores, --output, --model, --expected-frozen-hash and --expected-scores-hash');
  }
  if (hash(prefix + '-frozen.json') !== values['expected-frozen-hash']
    || hash(values.scores) !== values['expected-scores-hash']) throw new Error('Frozen artifact hash mismatch');
  const frozen = json(prefix + '-frozen.json');
  const scores = json(values.scores);
  const model = json(path.join(values.model, 'experiment-model.json'));
  const requiredModelFiles = ['config.json', 'model.safetensors', 'sentencepiece.bpe.model',
    'special_tokens_map.json', 'tokenizer.json', 'tokenizer_config.json'];
  if (model.model_id !== 'BAAI/bge-reranker-v2-m3' || model.revision !== '953dc6f6f85a1b2dbfca4c34a2796e7dde08d41e'
    || model.architecture !== 'AutoModelForSequenceClassification' || model.score !== 'raw_logit' || model.max_model_tokens !== 512
    || JSON.stringify(Object.keys(model.files).sort()) !== JSON.stringify(requiredModelFiles.sort())
    || JSON.stringify(scores.model) !== JSON.stringify(model)
    || scores.scorer_sha256 !== hash(new URL('score.py', import.meta.url))
    || Object.entries(model.files).some(([file, wanted]) => path.basename(file) !== file
      || hash(path.join(values.model, file)) !== wanted)) throw new Error('Pinned model or scorer mismatch');
  if (frozen.input_sha256 !== scores.input_sha256 || frozen.input_sha256 !== hash(prefix + '-input.json')
    || frozen.revision !== snapshot.manifest.revision || frozen.fingerprint !== snapshot.fingerprint
    || JSON.stringify(frozen.code_hashes) !== JSON.stringify(codeHashes())
    || Object.entries(frozen.case_hashes).some(([file, wanted]) => hash(file) !== wanted)) throw new Error('Frozen inputs changed');
  const ranked = new Map(scores.results.map((row) => [row.id, row]));
  if (ranked.size !== frozen.cases.length || ranked.size !== scores.results.length) throw new Error('Invalid score result IDs');
  const results = [];
  for (const sample of frozen.cases) {
    const observation = frozen.observations.find((row) => row.id === sample.id);
    const row = ranked.get(sample.id);
    if (!row) throw new Error('Missing scores');
    const variants = { baseline: observation.baseline };
    for (const variant of ['pool_lexical', 'reranked']) {
      const ranking = observation.exact ? undefined : variant === 'pool_lexical' ? observation.candidates
        : [...row.scores].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
      variants[variant] = measure(sample, lookup({ ...options, ranking }, args(sample), snapshot));
    }
    results.push({ id: sample.id, suite: sample.suite, expected_empty: Boolean(sample.expected_empty),
      exact_metadata_shortcut: observation.exact, candidate_coverage: observation.candidate_coverage,
      baseline_ms: observation.baseline_ms, ranking_ms: row.ranking_ms, variants });
    if (results.length % 10 === 0) console.error(JSON.stringify({ evaluated: results.length, total: frozen.cases.length }));
  }
  const summaries = Object.fromEntries(['baseline', 'pool_lexical', 'reranked'].map((variant) => {
    const positives = results.filter((row) => !row.expected_empty);
    const sum = (rows, field) => rows.reduce((total, row) => total + Number(row.variants[variant][field]), 0);
    return [variant, { cases: results.length, passed: sum(results, 'passed'), positives: positives.length,
      positive_passed: sum(positives, 'passed'), negative_passed: sum(results.filter((row) => row.expected_empty), 'passed'),
      groups_hit: sum(positives, 'evidence_groups_hit'), groups_total: sum(positives, 'evidence_groups_total'),
      regressions: results.filter((row) => row.variants.baseline.passed && !row.variants[variant].passed).map((row) => row.id),
      improvements: results.filter((row) => !row.variants.baseline.passed && row.variants[variant].passed).map((row) => row.id) }];
  }));
  if (hash(prefix + '-frozen.json') !== values['expected-frozen-hash'] || hash(values.scores) !== values['expected-scores-hash']
    || JSON.stringify(frozen.code_hashes) !== JSON.stringify(codeHashes())
    || Object.entries(frozen.case_hashes).some(([file, wanted]) => hash(file) !== wanted)) throw new Error('Inputs changed during evaluation');
  write(values.output, { observed_at: new Date().toISOString(), revision: frozen.revision, fingerprint: frozen.fingerprint,
    input_sha256: frozen.input_sha256, frozen_sha256: hash(prefix + '-frozen.json'), query_source: frozen.query_source,
    code_hashes: frozen.code_hashes, case_hashes: frozen.case_hashes, replay_sha256: sha256(replay),
    scores_sha256: hash(values.scores), model_run: { ...scores, results: undefined },
    candidate_limit: 50, summaries, results });
  console.log(JSON.stringify(summaries));
}
