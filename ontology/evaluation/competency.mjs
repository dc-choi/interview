import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { conceptQuery } from '../src/concept.mjs';
import { DEFAULT_SCOPES, labelKey, sha256 } from '../src/core.mjs';
import { lookup } from '../src/query.mjs';
import { PREDICATES } from '../src/schema.mjs';
import { loadSnapshot } from '../src/snapshot.mjs';

// Competency questions compare (a) a baseline lookup of the question, unscoped
// within the default allowlist, with (b) a concept query from start along
// predicate (depth 2, inference on). Both arms score the fraction of expected
// (path, heading) evidence they return. A case with expected_empty: true (as in
// score.mjs) scores 1 when the arm returns nothing: no lookup evidence units, no
// concept relations. Negative cases pass the concept arm by not resolving, so
// split summaries also report positive and negative means apart. A concept query
// that throws scores 0 and reports its error. The runner only reports; it never
// edits cases. Usage:
// node evaluation/competency.mjs --cache <dir> [--repo <path>] [--cases <file>]
const { values } = parseArgs({ options: {
  cache: { type: 'string' },
  repo: { type: 'string' },
  cases: { type: 'string' },
} });
if (!values.cache) throw new Error('--cache <dir> is required');
const options = {
  repo: resolve(values.repo ?? fileURLToPath(new URL('../..', import.meta.url))),
  cacheDir: resolve(values.cache),
  allowlist: DEFAULT_SCOPES,
};
const casesUrl = values.cases ? resolve(values.cases) : new URL('./competency-cases-2026-11-19.json', import.meta.url);
const caseBytes = readFileSync(casesUrl);
const cases = JSON.parse(caseBytes);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
// A predicate filter is a schema predicate name or inverse label; an empty string means no filter.
const predicates = new Set(['', ...PREDICATES.flatMap((item) => [item.name, item.inverse].filter(Boolean))]);
const ids = new Set();
if (!Array.isArray(cases) || cases.length === 0) throw new Error('Competency cases must be a nonempty array');
for (const sample of cases) {
  const empty = sample?.expected_empty === true;
  if (!sample || !isText(sample.id) || ids.has(sample.id) || !['calibration', 'holdout'].includes(sample.split)
    || !isText(sample.question) || !isText(sample.start) || !predicates.has(sample.predicate)
    || (sample.expected_empty !== undefined && typeof sample.expected_empty !== 'boolean')
    || !Array.isArray(sample.expected_evidence) || (empty ? sample.expected_evidence.length > 0 : sample.expected_evidence.length === 0)
    || !sample.expected_evidence.every((target) => isText(target?.path) && isText(target?.heading))
    || !Array.isArray(sample.expected_terms) || !sample.expected_terms.every(isText) || (empty && sample.expected_terms.length > 0)) {
    throw new Error(`Invalid competency case: ${sample?.id ?? '(no id)'}`);
  }
  ids.add(sample.id);
}

const snapshot = loadSnapshot(options);
const sections = new Set(snapshot.entities.filter((entity) => entity.type === 'Section')
  .map((entity) => `${entity.source_uri}\0${entity.anchor.heading_path.at(-1)}`));
const found = (evidence, target) => evidence.some((item) => item.source_uri === target.path
  && item.heading_path?.at(-1) === target.heading);
const score = (sample, evidence, answered) => {
  if (sample.expected_empty) return { evidence_score: answered ? 0 : 1, evidence_hits: [] };
  const hits = sample.expected_evidence.filter((target) => found(evidence, target));
  return { evidence_score: hits.length / sample.expected_evidence.length, evidence_hits: hits };
};
const mean = (numbers) => numbers.length > 0 ? numbers.reduce((total, value) => total + value, 0) / numbers.length : null;

const results = cases.map((sample) => {
  const answer = lookup(options, { query: sample.question, max_bytes: 24000 }, snapshot);
  const lookupEvidence = answer.evidence_units.map((unit) => ({ source_uri: unit.source_uri,
    heading_path: unit.anchor.heading_path }));
  let concept;
  let error;
  try {
    concept = conceptQuery(options, { concept: sample.start, depth: 2, include_inferred: true,
      ...(sample.predicate ? { predicates: [sample.predicate] } : {}) }, snapshot);
  } catch (caught) {
    // A failed query fails the arm; it is not an empty answer that passes a negative case.
    error = { code: caught.code ?? 'error', message: caught.message };
    concept = { result_status: 'error', concept: null, relations: [] };
  }
  const conceptEvidence = [...(concept.concept?.definition_evidence ?? []),
    ...concept.relations.flatMap((relation) => relation.evidence)];
  const peerKeys = concept.relations.map((relation) => labelKey(relation.peer.label));
  const terms = sample.expected_terms.filter((term) => peerKeys.some((key) => key.includes(labelKey(term))));
  return {
    id: sample.id,
    split: sample.split,
    expected_empty: sample.expected_empty === true,
    unknown_expected_evidence: sample.expected_evidence
      .filter((target) => !sections.has(`${target.path}\0${target.heading}`)),
    lookup: { result_status: answer.result_status, ...score(sample, lookupEvidence, lookupEvidence.length > 0),
      evidence_returned: lookupEvidence.length, bytes: answer.budget.used_bytes },
    concept: { result_status: concept.result_status, ...(error ? { error } : {}), concept_id: concept.concept?.id ?? null,
      ...(error ? { evidence_score: 0, evidence_hits: [] } : score(sample, conceptEvidence, concept.relations.length > 0)),
      evidence_returned: conceptEvidence.length,
      relations_returned: concept.relations.length,
      term_score: sample.expected_terms.length > 0 ? terms.length / sample.expected_terms.length : null,
      terms_found: terms, bytes: concept.budget?.used_bytes ?? null },
  };
});
const resolved = (row) => ['ok', 'partial'].includes(row.concept.result_status);
const summarize = (rows) => {
  const positive = rows.filter((row) => !row.expected_empty);
  const negative = rows.filter((row) => row.expected_empty);
  const evidenceScore = (list, arm) => mean(list.map((row) => row[arm].evidence_score));
  return {
    cases: rows.length,
    lookup_evidence_score: evidenceScore(rows, 'lookup'),
    concept_evidence_score: evidenceScore(rows, 'concept'),
    concept_term_score: mean(rows.map((row) => row.concept.term_score).filter((value) => value !== null)),
    concepts_resolved: rows.filter(resolved).length,
    cases_with_unknown_expected_evidence: rows.filter((row) => row.unknown_expected_evidence.length > 0).length,
    positive_cases: positive.length,
    negative_cases: negative.length,
    lookup: { positive_evidence_score: evidenceScore(positive, 'lookup'), negative_evidence_score: evidenceScore(negative, 'lookup') },
    concept: {
      positive_evidence_score: evidenceScore(positive, 'concept'),
      negative_evidence_score: evidenceScore(negative, 'concept'),
      positive_starts_resolved: positive.filter(resolved).length,
      resolved_positive_evidence_score: evidenceScore(positive.filter(resolved), 'concept'),
      negative_starts_resolved: negative.filter(resolved).length,
      errors: rows.filter((row) => row.concept.error).length,
    },
  };
};
console.log(JSON.stringify({
  observed_at: new Date().toISOString(),
  source_revision: snapshot.manifest.revision,
  fingerprint: snapshot.fingerprint,
  arms: {
    lookup: { input: 'question', scope: 'unscoped', allowlist: options.allowlist, max_bytes: 24000 },
    concept: { input: 'start', predicates: 'case predicate, none when empty', depth: 2, include_inferred: true,
      allowlist: options.allowlist },
  },
  query_code_hash: sha256(readFileSync(new URL('../src/query.mjs', import.meta.url))),
  concept_code_hash: sha256(readFileSync(new URL('../src/concept.mjs', import.meta.url))),
  schema_code_hash: sha256(readFileSync(new URL('../src/schema.mjs', import.meta.url))),
  evaluator_hash: sha256(readFileSync(new URL(import.meta.url))),
  cases_hash: sha256(caseBytes),
  splits: Object.fromEntries(['calibration', 'holdout']
    .map((split) => [split, summarize(results.filter((row) => row.split === split))])),
  cases: results,
}, null, 2));
