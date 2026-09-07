import { inScope, normalizeScopes } from '../src/core.mjs';
import { readBlob } from '../src/repository.mjs';
import { fromMarkdown } from 'mdast-util-from-markdown';

const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const matchesHeading = (unit, target) => !target.heading || unit.anchor?.heading_path?.at(-1) === target.heading;
function matchesBody(text, target) {
  if (!target.any_text) return true;
  const content = body(text);
  return target.any_text.some((part) => content.includes(part));
}

function body(text) {
  const headings = [];
  const visit = (node) => {
    if (node.type === 'heading') headings.push(node.position);
    for (const child of node.children ?? []) visit(child);
  };
  visit(fromMarkdown(text));
  let cursor = 0;
  let content = '';
  for (const position of headings) {
    content += text.slice(cursor, position.start.offset);
    cursor = position.end.offset;
  }
  return content + text.slice(cursor);
}

export function prepareCases(samples, snapshot, repo) {
  if (!Array.isArray(samples) || samples.length === 0) throw new Error('Evaluation cases must be a nonempty array');
  const ids = new Set();
  const blobs = new Map();
  return samples.map((sample) => {
    if (!sample || !nonempty(sample.id) || ids.has(sample.id) || !nonempty(sample.query)) {
      throw new Error('Evaluation cases require unique IDs and nonempty queries');
    }
    ids.add(sample.id);
    const expected = sample.expected_evidence ?? [{ path: sample.expected_path, heading: sample.expected_heading }];
    const scope = normalizeScopes(sample.scope ?? ['tech']);
    const maxBytes = sample.max_bytes ?? 24000;
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error(`Invalid byte budget in ${sample.id}`);
    if (sample.expected_empty !== undefined && typeof sample.expected_empty !== 'boolean') {
      throw new Error(`Invalid expected_empty in ${sample.id}`);
    }
    if (!Array.isArray(expected) || (sample.expected_empty ? expected.length !== 0 : expected.length === 0)) {
      throw new Error(`Invalid expected evidence in ${sample.id}`);
    }
    if (sample.forbidden_paths !== undefined && (!Array.isArray(sample.forbidden_paths)
      || !sample.forbidden_paths.every(nonempty))) throw new Error(`Invalid forbidden paths in ${sample.id}`);
    if (sample.min_relations !== undefined && (!Number.isSafeInteger(sample.min_relations) || sample.min_relations < 0)) {
      throw new Error(`Invalid minimum relations in ${sample.id}`);
    }
    for (const target of expected) {
      if (!target || !nonempty(target.path) || !inScope(target.path, scope)
        || (target.heading !== undefined && !nonempty(target.heading))
        || (target.any_text !== undefined && (!Array.isArray(target.any_text)
          || target.any_text.length === 0 || !target.any_text.every(nonempty)))) {
        throw new Error(`Invalid evidence target in ${sample.id}`);
      }
      const units = snapshot.entities.filter((unit) => unit.type === 'Section'
        && unit.source_uri === target.path && matchesHeading(unit, target));
      if (units.length === 0) throw new Error(`Gold source or heading missing from snapshot: ${sample.id}: ${target.path}`);
      if (target.any_text) {
        if (!blobs.has(target.path)) blobs.set(target.path, readBlob(repo, snapshot.manifest.revision, target.path));
        const blob = blobs.get(target.path);
        if (!units.some((unit) => matchesBody(blob.subarray(unit.anchor.start_byte, unit.anchor.end_byte).toString('utf8'), target))) {
          throw new Error(`Gold body text missing from pinned section: ${sample.id}: ${target.path}`);
        }
      }
    }
    return { ...sample, scope, max_bytes: maxBytes, expected_evidence: expected };
  });
}

export function scoreResult(sample, result) {
  const units = result.evidence_units;
  const targets = sample.expected_evidence;
  const documentHit = targets.some((target) => units.some((unit) => unit.source_uri === target.path));
  const headingHit = targets.some((target) => units.some((unit) => unit.source_uri === target.path && matchesHeading(unit, target)));
  const evidenceHit = targets.some((target) => units.some((unit) => unit.source_uri === target.path
    && matchesHeading(unit, target) && matchesBody(unit.excerpt, target)));
  const bodyTargets = targets.filter((target) => target.any_text);
  const bodyHit = bodyTargets.some((target) => units.some((unit) => unit.source_uri === target.path
    && matchesHeading(unit, target) && matchesBody(unit.excerpt, target)));
  const forbiddenHits = (sample.forbidden_paths ?? []).filter((path) => units.some((unit) => unit.source_uri === path));
  const outOfScope = [...new Set(units.filter((unit) => !inScope(unit.source_uri, sample.scope ?? ['tech']))
    .map((unit) => unit.source_uri))];
  const indexValid = result.index_sync?.length > 0 && result.index_sync.every((index) => index.requested_scope_indexed
    && index.artifacts_verified && index.completed);
  const emptyHit = sample.expected_empty && result.result_status === 'insufficient_evidence'
    && units.length === 0 && result.entities.length === 0 && result.relations.length === 0;
  const relevant = sample.expected_empty ? emptyHit : evidenceHit;
  return {
    gold_in_snapshot: sample.expected_empty ? null : true,
    document_hit: sample.expected_empty ? null : documentHit,
    heading_hit: sample.expected_empty ? null : headingHit,
    evidence_hit: sample.expected_empty ? null : evidenceHit,
    body_hit: bodyTargets.length === 0 ? null : bodyHit,
    forbidden_hits: forbiddenHits,
    out_of_scope_paths: outOfScope,
    index_valid: Boolean(indexValid),
    passed: Boolean(indexValid && relevant && forbiddenHits.length === 0 && outOfScope.length === 0
      && result.relations.length >= (sample.min_relations ?? 0)),
  };
}
