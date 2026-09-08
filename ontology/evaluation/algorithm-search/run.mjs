import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { DEFAULT_SCOPES, sha256 } from '../../src/core.mjs';
import { loadSnapshot } from '../../src/snapshot.mjs';
import { lookup as productionLookup } from '../../src/query.mjs';
import { prepareCases, scoreResult } from '../score.mjs';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const queryFile = new URL('../../src/query.mjs', import.meta.url);
const { values, positionals } = parseArgs({ allowPositionals: true, options: {
  data: { type: 'string' }, cases: { type: 'string', multiple: true }, rankings: { type: 'string' },
  output: { type: 'string' },
} });
if (!values.data || !['prepare', 'evaluate'].includes(positionals[0])) {
  throw new Error('Usage: node run.mjs prepare|evaluate --data DIR [--cases FILE] [--rankings FILE --output FILE]');
}
const data = path.resolve(values.data);
const options = { repo, allowlist: DEFAULT_SCOPES };
const snapshot = loadSnapshot(options);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const sourcePath = (entity) => entity.source_uri ?? entity.source_path;
const useful = (section) => section.type === 'Section' && section.anchor?.heading_path.length > 0
  && !['출처', '관련 문서', '관련문서'].includes(section.label.trim().toLowerCase());
const codeHashes = () => Object.fromEntries(['run.mjs', 'rank.py', 'lexical.py', '../score.mjs'].map((name) => [name,
  sha256(fs.readFileSync(new URL(name, import.meta.url)))]));

if (positionals[0] === 'prepare') {
  fs.mkdirSync(data, { recursive: true });
  const names = values.cases ?? ['cases.json', 'validation-cases.json', 'holdout-cases.json',
    'generalization-cases-2026-09-07.json', 'context-integrity-cases.json',
    'document-search-cases-2026-09-08.json', 'metadata-ranking-cases-2026-09-08.json',
    'graph-ranking-cases-2026-09-08.json', 'diagnostic-cases.json', 'context-packing-cases-2026-09-08.json'];
  const files = names.map((name) => path.isAbsolute(name) ? name : fileURLToPath(new URL('../' + name, import.meta.url)));
  const samples = prepareCases(files.flatMap((file) => readJson(file).map((sample) => ({
    ...sample, suite: path.basename(file),
  }))), snapshot, repo);
  const docs = snapshot.entities.filter((entity) => entity.type === 'Document');
  const documents = new Map(docs.map((doc) => [sourcePath(doc), doc]));
  const child = spawnSync('git', ['-C', repo, 'cat-file', '--batch'], {
    input: docs.map((doc) => `${snapshot.manifest.revision}:${sourcePath(doc)}`).join('\n') + '\n',
    maxBuffer: 128 * 1024 * 1024, timeout: 60000,
    env: { ...process.env, GIT_NO_REPLACE_OBJECTS: '1', GIT_OPTIONAL_LOCKS: '0' },
  });
  if (child.status !== 0 || child.error) throw new Error('Cannot export pinned source blobs');
  const blobs = new Map();
  let offset = 0;
  for (const doc of docs) {
    const newline = child.stdout.indexOf(10, offset);
    const [oid, type, size] = child.stdout.subarray(offset, newline).toString('utf8').split(' ');
    const length = Number(size);
    if (newline < 0 || type !== 'blob' || !oid || !Number.isSafeInteger(length)
      || newline + length + 2 > child.stdout.length) throw new Error('Invalid pinned blob');
    blobs.set(sourcePath(doc), child.stdout.subarray(newline + 1, newline + 1 + length));
    offset = newline + length + 2;
  }
  const rows = snapshot.entities.filter(useful).map((section) => {
    const raw = blobs.get(section.source_uri).subarray(section.anchor.start_byte, section.anchor.end_byte);
    if (sha256(raw) !== section.content_hash.replace(/^sha256:/, '')) throw new Error('Source hash mismatch');
    return { id: section.id, path: section.source_uri, title: documents.get(section.source_uri).label,
      heading: section.anchor.heading_path.join(' > '), text: raw.toString('utf8') };
  }).sort((a, b) => a.id.localeCompare(b.id));
  writeJson(path.join(data, 'corpus.json'), rows);
  writeJson(path.join(data, 'queries.json'), samples.map(({ id, query, scope }) => ({ id, query, scope })));
  writeJson(path.join(data, 'inputs.json'), {
    revision: snapshot.manifest.revision, fingerprint: snapshot.fingerprint,
    query_code_hash: sha256(fs.readFileSync(queryFile)), experiment_code_hashes: codeHashes(),
    corpus_sha256: sha256(fs.readFileSync(path.join(data, 'corpus.json'))),
    queries_sha256: sha256(fs.readFileSync(path.join(data, 'queries.json'))),
    case_hashes: Object.fromEntries(files.map((file) => [path.basename(file), sha256(fs.readFileSync(file))])),
    cases: samples,
  });
  console.log(JSON.stringify({ stage: 'prepared', sections: rows.length, cases: samples.length,
    revision: snapshot.manifest.revision }));
} else {
  if (!values.rankings || !values.output) throw new Error('evaluate requires --rankings and --output');
  const inputs = readJson(path.join(data, 'inputs.json'));
  const rankings = readJson(values.rankings);
  const code = fs.readFileSync(queryFile, 'utf8');
  if (inputs.revision !== snapshot.manifest.revision || inputs.fingerprint !== snapshot.fingerprint
    || inputs.query_code_hash !== sha256(code)
    || inputs.corpus_sha256 !== rankings.corpus_sha256
    || inputs.corpus_sha256 !== sha256(fs.readFileSync(path.join(data, 'corpus.json')))
    || rankings.inputs_sha256 !== sha256(fs.readFileSync(path.join(data, 'inputs.json')))
    || inputs.queries_sha256 !== rankings.queries_sha256
    || sha256(fs.readFileSync(path.join(data, 'queries.json'))) !== rankings.queries_sha256
    || JSON.stringify(inputs.experiment_code_hashes) !== JSON.stringify(codeHashes())) {
    throw new Error('Frozen experiment inputs changed; prepare and rank again');
  }
  const byId = new Map(snapshot.entities.filter(useful).map((section) => [section.id, section]));
  const rows = new Map(readJson(path.join(data, 'corpus.json')).map((row) => [row.id, row]));
  const rankedById = new Map(rankings.results.map((row) => [row.id, row]));
  // Replay candidate scores through the existing packer without changing production code.
  // ponytail: a checked source marker avoids a production experiment API; extract a ranker only if adopted.
  const marker = '  const roots = [...scored.values()].sort';
  if (code.split(marker).length !== 2) throw new Error('Ranking replay marker changed');
  let replay = code.replace(marker, `
  if (options.algorithmRanking && !hasExactMetadataHit) {
    scored.clear();
    sectionScores.clear();
    for (const { id, score } of options.algorithmRanking) {
      const section = sectionsById.get(id);
      if (!section || !isUsefulSection(section) || !section.anchor.heading_path.length
        || !Number.isFinite(score)) throw new Error('Invalid experimental section score');
      const doc = documentsByPath.get(sourcePath(section));
      sectionScores.set(id, score);
      if (!scored.has(doc.id)) scored.set(doc.id, { doc, direct: section, score,
        metadataMatch: false, matchedTokens: new Set(matchingTokens(section, tokens)) });
    }
  }
${marker}`);
  const observer = "  if (mode === 'search') return documentSearchPage({ base, request, roots, byDocument, scopes, tokens });";
  if (replay.split(observer).length !== 2) throw new Error('Candidate observer marker changed');
  replay = replay.replace(observer, `
  options.observeCandidates?.({ exact: hasExactMetadataHit, roots,
    sections: searchableSections.filter((s) => s.anchor.heading_path.length && scored.has(documentIdFor(s, documentsByPath)))
      .filter((s) => (sectionScores.get(s.id) ?? 0) > 0)
      .sort((a, b) => (sectionScores.get(b.id) ?? 0) - (sectionScores.get(a.id) ?? 0) || a.id.localeCompare(b.id))
      .slice(0, 50).map((s) => s.id) });
${observer}`);
  const multiMarker = '  // Finish selected sections when their remaining context fits the response.';
  if (replay.split(multiMarker).length !== 2) throw new Error('Section packing marker changed');
  replay = replay.replace(multiMarker, `
  if (options.multipleSections && options.algorithmRanking && !hasExactMetadataHit) {
    let added = 0;
    for (const { id } of options.algorithmRanking) {
      const section = sectionsById.get(id);
      const owner = documentIdFor(section, documentsByPath);
      if (!base.entities.some((entity) => entity.id === owner) || base.evidence_units.some((unit) => unit.id === id)) continue;
      const item = evidence(id);
      if (!item) continue;
      base.evidence_units.push(item);
      if (outputBytes(base) > effectiveMaxBytes) base.evidence_units.pop();
      else if (++added === 6) break;
    }
  }
${multiMarker}`);
  replay = replay.replaceAll("from './", `from '${new URL('../../src/', import.meta.url).href}`);
  const replayFile = path.join(data, 'query-replay.mjs');
  fs.writeFileSync(replayFile, replay);
  const { lookup } = await import(pathToFileURL(replayFile));
  const results = [];
  for (const sample of inputs.cases) {
    const ranked = rankedById.get(sample.id);
    if (!ranked) throw new Error(`Missing rankings: ${sample.id}`);
    const measurements = {};
    for (const variant of ['current', 'bm25', 'dense', 'hybrid', 'hybrid_multi']) {
      const branch = variant === 'hybrid_multi' ? 'hybrid' : variant;
      let candidates;
      const started = performance.now();
      const result = lookup({ ...options, algorithmRanking: branch === 'current' ? undefined : ranked[branch],
        multipleSections: variant === 'hybrid_multi', observeCandidates: (value) => { candidates = value; } },
      { query: sample.query, scope: sample.scope, max_bytes: sample.max_bytes }, snapshot);
      const elapsed = performance.now() - started;
      if (variant === 'current') {
        const original = productionLookup(options,
          { query: sample.query, scope: sample.scope, max_bytes: sample.max_bytes }, snapshot);
        if (JSON.stringify(original) !== JSON.stringify(result)) throw new Error('Baseline replay differs from production');
      }
      const bytes = Buffer.byteLength(JSON.stringify(result));
      if (bytes !== result.budget.used_bytes || bytes > sample.max_bytes) throw new Error('Budget mismatch');
      const ids = branch === 'current' || candidates.exact ? candidates.sections : ranked[branch].map((item) => item.id);
      const candidateUnits = ids.map((id) => ({ ...byId.get(id), excerpt: rows.get(id).text }));
      const candidateScore = sample.expected_empty ? null : scoreResult(sample, { ...result, evidence_units: candidateUnits });
      measurements[variant] = { ...scoreResult(sample, result),
        candidate_groups_hit_at_50: candidateScore?.evidence_groups_hit ?? null,
        candidate_groups_total: candidateScore?.evidence_groups_total ?? null,
        candidate_all_groups_at_50: candidateScore?.evidence_hit ?? null,
        exact_metadata_shortcut: candidates.exact, bytes, result_status: result.result_status,
        replay_elapsed_ms: Math.round(elapsed * 100) / 100,
        rank_ms: branch === 'current' ? null : ranked.timing_ms[branch === 'hybrid' ? 'hybrid_sequential' : branch],
        returned_sections: result.evidence_units.map((unit) => ({ path: unit.source_uri, heading: unit.anchor.heading_path.at(-1) })),
      };
    }
    results.push({ id: sample.id, suite: sample.suite, expected_empty: Boolean(sample.expected_empty), measurements });
    console.error(JSON.stringify({ stage: 'evaluate', completed: results.length, total: inputs.cases.length }));
  }
  const summaries = {};
  for (const suite of ['all', ...new Set(results.map((sample) => sample.suite))]) {
    const subset = results.filter((sample) => suite === 'all' || sample.suite === suite);
    summaries[suite] = Object.fromEntries(['current', 'bm25', 'dense', 'hybrid', 'hybrid_multi'].map((variant) => {
      const positive = subset.filter((sample) => !sample.expected_empty).map((sample) => sample.measurements[variant]);
      const negative = subset.filter((sample) => sample.expected_empty).map((sample) => sample.measurements[variant]);
      const sum = (items, field) => items.reduce((total, item) => total + Number(item[field]), 0);
      return [variant, { cases: subset.length, passed: sum([...positive, ...negative], 'passed'),
        positives: positive.length, positive_passed: sum(positive, 'passed'),
        negatives: negative.length, negative_passed: sum(negative, 'passed'),
        groups_hit: sum(positive, 'evidence_groups_hit'), groups_total: sum(positive, 'evidence_groups_total'),
        candidate_groups_hit_at_50: sum(positive, 'candidate_groups_hit_at_50'),
        candidate_all_groups_at_50: sum(positive, 'candidate_all_groups_at_50'),
        regressions: subset.filter((sample) => sample.measurements.current.passed && !sample.measurements[variant].passed).map((sample) => sample.id),
        improvements: subset.filter((sample) => !sample.measurements.current.passed && sample.measurements[variant].passed).map((sample) => sample.id),
      }];
    }));
  }
  writeJson(values.output, { observed_at: new Date().toISOString(), ...inputs, cases: undefined,
    model: rankings.model, device: rankings.device, candidate_limit: 50, rrf_constant: 60,
    lexical_build_ms: rankings.lexical_build_ms, embedding_build_ms: rankings.embedding_build_ms,
    embedding_cache_key: rankings.embedding_cache_key, vectors_sha256: rankings.vectors_sha256,
    embedding_cache_hit: rankings.embedding_cache_hit, replay_code_hash: sha256(replay),
    ranking_output_hash: sha256(fs.readFileSync(values.rankings)),
    limits: ['Synthetic judgments, not final answer quality.',
      'Current exact metadata shortcut is shared by all variants.',
      'Replay preserves original graph packing and executes original lexical scoring before overriding scores.',
      'Replay latency is not an optimized production hybrid latency. Rank times exclude corpus/model/index loading.',
      'Dense passages truncate at 512 model tokens. No abstention threshold has been calibrated.',
      'Hybrid_multi adds at most six candidate sections in spare space after existing graph bundles.',
      'Existing MCP runtime and production source are unchanged.'], summaries, results });
  console.log(JSON.stringify(summaries));
}
