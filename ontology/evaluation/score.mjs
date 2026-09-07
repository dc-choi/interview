import { inScope, normalizeScopes } from '../src/core.mjs';
import { readBlob } from '../src/repository.mjs';
import { fromMarkdown } from 'mdast-util-from-markdown';

const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const matchesHeading = (unit, target) => !target.heading || unit.anchor?.heading_path?.at(-1) === target.heading;
function matchesBody(text, target) {
  if (!target.any_text && !target.all_text) return true;
  const content = body(text);
  return (!target.any_text || target.any_text.some((part) => content.includes(part)))
    && (!target.all_text || target.all_text.every((part) => content.includes(part)));
}

const hasBodyAssertion = (target) => target.any_text || target.all_text;
const matchesDocument = (unit, target) => unit.source_uri === target.path;
const matchesHeadingTarget = (unit, target) => matchesDocument(unit, target) && matchesHeading(unit, target);
const matchesEvidence = (unit, target) => matchesHeadingTarget(unit, target) && matchesBody(unit.excerpt, target);
const groupMatches = (group, units, matches) => group.any_of.some((target) => units
  .some((unit) => matches(unit, target)));
const groupBodyMatches = (group, units) => group.any_of.filter(hasBodyAssertion)
  .some((target) => units.some((unit) => matchesEvidence(unit, target)));

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
    const hasExpected = sample.expected_evidence !== undefined;
    const hasGroups = sample.expected_evidence_groups !== undefined;
    const hasLegacyTarget = sample.expected_path !== undefined || sample.expected_heading !== undefined;
    if (sample.expected_empty !== undefined && typeof sample.expected_empty !== 'boolean') {
      throw new Error(`Invalid expected_empty in ${sample.id}`);
    }
    if ((hasGroups && (hasExpected || hasLegacyTarget)) || (hasExpected && hasLegacyTarget)) {
      throw new Error(`Mixed evidence formats in ${sample.id}`);
    }
    if (sample.expected_empty && hasGroups) throw new Error(`Invalid evidence groups in ${sample.id}`);
    if (hasGroups && !Array.isArray(sample.expected_evidence_groups)) {
      throw new Error(`Invalid evidence groups in ${sample.id}`);
    }
    const expected = hasGroups ? sample.expected_evidence_groups.flatMap((group) => group?.any_of ?? [])
      : sample.expected_evidence ?? [{ path: sample.expected_path, heading: sample.expected_heading }];
    const scope = normalizeScopes(sample.scope ?? ['tech']);
    const maxBytes = sample.max_bytes ?? 24000;
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error(`Invalid byte budget in ${sample.id}`);
    let groups;
    if (sample.expected_empty) groups = [];
    else if (hasGroups) groups = sample.expected_evidence_groups;
    else groups = [{ id: 'legacy', any_of: expected }];
    const groupIds = new Set();
    for (const group of groups) {
      if (!group || !nonempty(group.id) || groupIds.has(group.id)
        || !Array.isArray(group.any_of) || group.any_of.length === 0) {
        throw new Error(`Invalid evidence groups in ${sample.id}`);
      }
      groupIds.add(group.id);
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
          || target.any_text.length === 0 || !target.any_text.every(nonempty)))
        || (target.all_text !== undefined && (!Array.isArray(target.all_text)
          || target.all_text.length === 0 || !target.all_text.every(nonempty)))) {
        throw new Error(`Invalid evidence target in ${sample.id}`);
      }
      const units = snapshot.entities.filter((unit) => unit.type === 'Section'
        && unit.source_uri === target.path && matchesHeading(unit, target));
      if (units.length === 0) throw new Error(`Gold source or heading missing from snapshot: ${sample.id}: ${target.path}`);
      if (hasBodyAssertion(target)) {
        if (!blobs.has(target.path)) blobs.set(target.path, readBlob(repo, snapshot.manifest.revision, target.path));
        const blob = blobs.get(target.path);
        if (!units.some((unit) => matchesBody(blob.subarray(unit.anchor.start_byte, unit.anchor.end_byte).toString('utf8'), target))) {
          throw new Error(`Gold body text missing from pinned section: ${sample.id}: ${target.path}`);
        }
      }
    }
    return { ...sample, scope, max_bytes: maxBytes, expected_evidence: hasGroups ? undefined : expected };
  });
}

export function scoreResult(sample, result) {
  const units = result.evidence_units;
  const legacy = sample.expected_evidence_groups === undefined;
  const groups = legacy ? [{ id: 'legacy', any_of: sample.expected_evidence }] : sample.expected_evidence_groups;
  const documentHit = groups.every((group) => groupMatches(group, units, matchesDocument));
  const headingHit = groups.every((group) => groupMatches(group, units, matchesHeadingTarget));
  const evidenceMatches = groups.map((group) => groupMatches(group, units, matchesEvidence));
  const evidenceGroupsHit = evidenceMatches.filter(Boolean).length;
  const evidenceHit = evidenceMatches.every(Boolean);
  const bodyTargets = legacy ? sample.expected_evidence.filter(hasBodyAssertion)
    : groups.filter((group) => group.any_of.some(hasBodyAssertion));
  let bodyHit = null;
  if (bodyTargets.length > 0) {
    if (legacy) bodyHit = bodyTargets.some((target) => units.some((unit) => matchesEvidence(unit, target)));
    else bodyHit = bodyTargets.every((group) => groupBodyMatches(group, units));
  }
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
    body_hit: sample.expected_empty ? null : bodyHit,
    evidence_groups_total: sample.expected_empty ? null : groups.length,
    evidence_groups_hit: sample.expected_empty ? null : evidenceGroupsHit,
    missing_evidence_groups: sample.expected_empty ? null : groups.filter((group, index) => !evidenceMatches[index])
      .map((group) => group.id),
    evidence_recall: sample.expected_empty ? null : evidenceGroupsHit / groups.length,
    forbidden_hits: forbiddenHits,
    out_of_scope_paths: outOfScope,
    index_valid: Boolean(indexValid),
    passed: Boolean(indexValid && relevant && forbiddenHits.length === 0 && outOfScope.length === 0
      && result.relations.length >= (sample.min_relations ?? 0)),
  };
}
