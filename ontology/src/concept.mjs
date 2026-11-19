import { ContextError, conceptSlug, inScope, labelKey, normalizeScopes, stableJson } from './core.mjs';
import { CLASS_BY_NAME, CONCEPT_TYPES, PREDICATES, PREDICATE_BY_NAME, hasCharacteristic, isA } from './schema.mjs';
import { LIMITATIONS, effectiveScopes, indexSync, outputBytes, queryRelevantGaps, scopedGaps } from './query.mjs';
import { getRepoState } from './repository.mjs';
import { loadSnapshot } from './snapshot.mjs';

export const CONCEPT_LIMITS = Object.freeze({
  maxArgumentBytes: 8192,
  maxConceptBytes: 1024,
  maxFilters: 16,
  defaultMaxBytes: 24000,
  serverMaxBytes: 65536,
});
const MAX_RELATIONS = 50;
const MAX_DOCUMENTS = 20;
const MAX_CANDIDATES = 8;
const DOCUMENT_PREDICATES = ['tagged_with', 'mentions', 'in_category'];
const PREDICATE_NAMES = new Set(PREDICATES.flatMap((item) => [item.name, item.inverse].filter(Boolean)));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const fail = (code, message) => { throw new ContextError(code, message); };
const append = (map, key, value) => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};
const byId = (a, b) => a.id < b.id ? -1 : Number(a.id > b.id);

function validateOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail('invalid_options', 'options must be an object');
  if (typeof options.repo !== 'string' || !options.repo) fail('invalid_options', 'repo is required');
  if (options.cacheDir !== undefined && (typeof options.cacheDir !== 'string' || !options.cacheDir)) {
    fail('invalid_options', 'cacheDir must be a non-empty string when provided');
  }
  if (!Array.isArray(options.allowlist)) fail('invalid_options', 'allowlist must be an array');
  return normalizeScopes(options.allowlist);
}

function validateArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) fail('invalid_arguments', 'arguments must be an object');
  for (const key of Object.keys(args)) {
    if (!['concept', 'predicates', 'types', 'depth', 'include_inferred', 'max_bytes'].includes(key)) {
      fail('invalid_arguments', `unknown argument: ${key}`);
    }
  }
  if (Buffer.byteLength(stableJson(args), 'utf8') > CONCEPT_LIMITS.maxArgumentBytes) {
    fail('arguments_too_large', `arguments exceed ${CONCEPT_LIMITS.maxArgumentBytes} bytes`);
  }
  if (typeof args.concept !== 'string' || !args.concept.trim()
    || Buffer.byteLength(args.concept, 'utf8') > CONCEPT_LIMITS.maxConceptBytes) {
    fail('invalid_concept', `concept must contain non-whitespace text of at most ${CONCEPT_LIMITS.maxConceptBytes} bytes`);
  }
  const names = (field, allowed) => {
    if (!own(args, field)) return undefined;
    if (!Array.isArray(args[field]) || args[field].length === 0 || args[field].length > CONCEPT_LIMITS.maxFilters
      || args[field].some((item) => !allowed.has(item))) {
      fail(`invalid_${field}`, `${field} must list 1 to ${CONCEPT_LIMITS.maxFilters} names from the schema`);
    }
    return args[field];
  };
  const predicates = names('predicates', PREDICATE_NAMES);
  const types = names('types', new Set(CLASS_BY_NAME.keys()));
  if (own(args, 'depth') && ![1, 2, 3].includes(args.depth)) fail('invalid_depth', 'depth must be 1, 2 or 3');
  if (own(args, 'include_inferred') && typeof args.include_inferred !== 'boolean') {
    fail('invalid_arguments', 'include_inferred must be a boolean');
  }
  if (own(args, 'max_bytes') && (!Number.isSafeInteger(args.max_bytes) || args.max_bytes <= 0)) {
    fail('invalid_max_bytes', 'max_bytes must be a positive integer');
  }
  return { term: args.concept.trim(), predicates, types, depth: args.depth ?? 1, inferred: args.include_inferred ?? true,
    requestedMaxBytes: args.max_bytes ?? CONCEPT_LIMITS.defaultMaxBytes };
}

/**
 * Resolves one typed concept and returns its source-confirmed relations. With
 * include_inferred, schema rules add query-time relations flagged inferred: true;
 * they are never written to the snapshot.
 */
export function conceptQuery(options, args, snapshot) {
  const allowlist = validateOptions(options);
  const request = validateArgs(args);
  snapshot ??= loadSnapshot({ repo: options.repo, cacheDir: options.cacheDir });
  const { manifest, entities, relations, fingerprint, manifest_hash: manifestHash } = snapshot;
  const scopes = effectiveScopes(allowlist, manifest.indexed_paths, []);
  const visible = (entity) => Boolean(entity) && inScope(entity.source_uri ?? '', scopes);
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const concepts = entities.filter((entity) => CONCEPT_TYPES.includes(entity.type) && visible(entity));
  const effectiveMaxBytes = Math.min(request.requestedMaxBytes, CONCEPT_LIMITS.serverMaxBytes);
  const payload = {
    query: request.term,
    result_status: 'concept_not_found',
    index_sync: indexSync({ ...manifest, fingerprint, manifest_hash: manifestHash }, getRepoState(options.repo),
      scopes, [], scopes.length > 0),
    concept: null,
    candidates: [],
    relations: [],
    documents: [],
    coverage_gaps: [],
    limitations: LIMITATIONS,
    traversal: { depth: request.depth, include_inferred: request.inferred, max_relations: MAX_RELATIONS,
      max_documents: MAX_DOCUMENTS, limit_reached: false },
    budget: { requested_max_bytes: request.requestedMaxBytes, server_max_bytes: CONCEPT_LIMITS.serverMaxBytes,
      effective_max_bytes: effectiveMaxBytes, used_bytes: 0, exhausted: false, omitted_relations: 0, omitted_documents: 0,
      omitted_candidates: 0 },
  };
  const relevantGaps = (paths) => queryRelevantGaps(scopedGaps(manifest, scopes),
    [...new Set(paths)].map((path) => ({ doc: { source_uri: path } })), manifest.source_id, scopes);

  // Resolution: canonical ID, shorthand concept:<slug>, or a slug, label or alias key.
  const term = /^concept:[^:]+$/.test(request.term) ? `concept:${manifest.source_id}:${request.term.slice(8)}` : request.term;
  const termKey = labelKey(request.term);
  let matches = concepts.filter((concept) => concept.id === term);
  if (matches.length === 0 && termKey) {
    matches = concepts.filter((concept) => [conceptSlug(concept.id), concept.label, ...concept.aliases]
      .some((name) => labelKey(name) === termKey));
  }
  if (matches.length !== 1) {
    payload.result_status = matches.length === 0 ? 'concept_not_found' : 'ambiguous_concept';
    // Not found: suggest concepts with a slug, label or alias that contains the term
    // or is contained in it. The closest name wins: the shared length over the
    // longer of the two keys, best name per concept, then concept id. A suggestion
    // is never resolved automatically.
    if (matches.length === 0 && termKey.length >= 2) {
      const coverage = new Map();
      for (const concept of concepts) {
        const best = Math.max(0, ...[conceptSlug(concept.id), concept.label, ...concept.aliases].map((name) => labelKey(name))
          .filter((name) => name.length >= 2 && (name.includes(termKey) || termKey.includes(name)))
          .map((name) => Math.min(name.length, termKey.length) / Math.max(name.length, termKey.length)));
        if (best > 0) coverage.set(concept, best);
      }
      matches = [...coverage.keys()].sort((a, b) => coverage.get(b) - coverage.get(a) || byId(a, b));
    } else matches.sort(byId);
    payload.candidates = matches.slice(0, MAX_CANDIDATES).map((concept) => ({ id: concept.id,
      type: concept.type, label: concept.label, aliases: concept.aliases, declared_in: concept.source_uri }));
    payload.budget.omitted_candidates = matches.length - payload.candidates.length;
    payload.coverage_gaps = relevantGaps(payload.candidates.map((candidate) => candidate.declared_in));
    return fitBudget(payload);
  }

  const [concept] = matches;
  const up = new Map();
  const down = new Map();
  const supports = new Map();
  const documentEdges = new Map();
  const incident = [];
  for (const relation of relations) {
    // An edge asserted outside the allowlist is ignored, even between visible concepts.
    if (relation.verification !== 'source_confirmed' || !visible(entityById.get(relation.evidence_unit_id))) continue;
    if (relation.predicate === 'broader') {
      append(up, relation.subject, relation);
      append(down, relation.object, relation);
    }
    if (relation.predicate === 'supported_by') append(supports, relation.subject, relation.object);
    if (DOCUMENT_PREDICATES.includes(relation.predicate)) append(documentEdges, relation.object, relation);
    if (relation.subject === concept.id || relation.object === concept.id) incident.push(relation);
  }
  const evidenceItems = (unitIds) => {
    const items = new Map();
    for (const unit of unitIds.map((unitId) => entityById.get(unitId))) {
      if (visible(unit) && unit.anchor && !items.has(unit.id)) {
        items.set(unit.id, { evidence_unit_id: unit.id, source_uri: unit.source_uri,
          heading_path: unit.anchor.heading_path, content_hash: unit.content_hash });
      }
    }
    return [...items.values()];
  };
  // Supporting Sections first, then the frontmatter anchor that asserts the edge.
  const evidenceOf = (edges) => evidenceItems(edges.flatMap((edge) => [
    ...(supports.get(edge.evidence_unit_id) ?? []), edge.evidence_unit_id]));
  payload.concept = { id: concept.id, type: concept.type, label: concept.label, aliases: concept.aliases,
    declared_in: concept.source_uri, definition_evidence: evidenceItems([
      ...incident.filter((edge) => edge.predicate === 'declares').map((edge) => edge.evidence_unit_id),
      ...incident.filter((edge) => edge.predicate === 'supported_by' && edge.subject === concept.id).map((edge) => edge.object),
    ]) };

  const presented = [];
  const present = (item, edges, schemaName) => {
    if (request.predicates && !request.predicates.includes(item.predicate) && !request.predicates.includes(schemaName)) return;
    if (request.types && !request.types.some((type) => isA(item.peer.type, type))) return;
    const evidence = evidenceOf(edges);
    if (evidence.length === 0) return;
    presented.push({ ...item, peer: { id: item.peer.id, type: item.peer.type, label: item.peer.label }, evidence });
  };
  for (const edge of incident) {
    const out = edge.subject === concept.id;
    if (edge.predicate === 'declares' || DOCUMENT_PREDICATES.includes(edge.predicate)
      || (out && edge.predicate === 'supported_by')) continue;
    const peer = entityById.get(out ? edge.object : edge.subject);
    if (!visible(peer)) continue;
    const predicate = PREDICATE_BY_NAME.get(edge.predicate);
    if (out) present({ predicate: edge.predicate, direction: 'out', peer, inferred: false }, [edge], edge.predicate);
    else if (request.inferred && hasCharacteristic(predicate, 'symmetric')) {
      present({ predicate: edge.predicate, direction: 'out', peer, inferred: true, rule: 'symmetric',
        derived_from: [edge.id] }, [edge], edge.predicate);
    } else if (request.inferred && predicate.inverse) {
      present({ predicate: predicate.inverse, direction: 'out', peer, inferred: true, rule: 'inverse',
        derived_from: [edge.id] }, [edge], edge.predicate);
    } else present({ predicate: edge.predicate, direction: 'in', peer, inferred: false }, [edge], edge.predicate);
  }
  // Transitive broader closure, bounded by depth. Build-time validation keeps the hierarchy acyclic.
  const closure = (index, next) => {
    const reached = [];
    const seen = new Set([concept.id]);
    let frontier = [{ node: concept.id, route: [] }];
    for (let hop = 1; hop <= request.depth && frontier.length > 0; hop += 1) {
      const following = [];
      for (const { node, route } of frontier) {
        for (const edge of index.get(node) ?? []) {
          const peer = entityById.get(next(edge));
          if (!visible(peer) || seen.has(peer.id)) continue;
          seen.add(peer.id);
          following.push({ node: peer.id, route: [...route, edge] });
          reached.push({ peer, route: [...route, edge], hop });
        }
      }
      frontier = following;
    }
    return reached;
  };
  const narrower = request.inferred ? closure(down, (edge) => edge.subject) : [];
  if (request.inferred) {
    for (const [label, reached] of [['broader', closure(up, (edge) => edge.object)], ['narrower', narrower]]) {
      for (const { peer, route, hop } of reached) {
        if (hop < 2) continue;
        present({ predicate: label, direction: 'out', peer, inferred: true, rule: 'transitive',
          derived_from: route.map((edge) => edge.id) }, route, 'broader');
      }
    }
  }
  // One row per predicate, direction and peer. A relation stated by several sources,
  // or both stated and inferred, keeps the evidence of each; a stated row stays inferred: false.
  const merged = new Map();
  for (const item of presented.sort((a, b) => Number(a.inferred) - Number(b.inferred) || a.predicate.localeCompare(b.predicate)
    || a.direction.localeCompare(b.direction) || (a.derived_from?.length ?? 0) - (b.derived_from?.length ?? 0)
    || byId(a.peer, b.peer))) {
    const key = `${item.predicate}\0${item.direction}\0${item.peer.id}`;
    const kept = merged.get(key);
    if (!kept) {
      merged.set(key, item);
      continue;
    }
    const known = new Set(kept.evidence.map((entry) => entry.evidence_unit_id));
    kept.evidence.push(...item.evidence.filter((entry) => !known.has(entry.evidence_unit_id)));
    if (kept.inferred) kept.derived_from = [...new Set([...kept.derived_from, ...item.derived_from])];
  }
  const ordered = [...merged.values()];

  // Documents tagged with, mentioning or categorized under the concept, then
  // (with inference) under its narrower concepts within depth.
  const documentsByPath = new Map(entities.filter((entity) => entity.type === 'Document')
    .map((entity) => [entity.source_uri, entity]));
  const documents = new Map();
  for (const { conceptId, inferred } of [{ conceptId: concept.id, inferred: false },
    ...narrower.map(({ peer }) => ({ conceptId: peer.id, inferred: true }))]) {
    const found = (documentEdges.get(conceptId) ?? [])
      .filter((edge) => !request.predicates || request.predicates.includes(edge.predicate))
      .map((edge) => {
        const subject = entityById.get(edge.subject);
        return { edge, doc: subject?.type === 'Document' ? subject : documentsByPath.get(subject?.source_uri) };
      })
      .filter(({ doc }) => visible(doc) && doc.status !== 'vocabulary')
      .sort((a, b) => a.doc.source_uri < b.doc.source_uri ? -1 : Number(a.doc.source_uri > b.doc.source_uri));
    for (const { edge, doc } of found) {
      if (!documents.has(doc.id)) documents.set(doc.id, { id: doc.id, label: doc.label, source_uri: doc.source_uri,
        predicate: edge.predicate, concept_id: conceptId, inferred });
    }
  }

  payload.result_status = 'ok';
  payload.relations = ordered.slice(0, MAX_RELATIONS);
  payload.documents = [...documents.values()].slice(0, MAX_DOCUMENTS);
  payload.budget.omitted_relations = ordered.length - payload.relations.length;
  payload.budget.omitted_documents = documents.size - payload.documents.length;
  payload.traversal.limit_reached = payload.budget.omitted_relations + payload.budget.omitted_documents > 0;
  if (payload.traversal.limit_reached) payload.result_status = 'partial';
  payload.coverage_gaps = relevantGaps([concept.source_uri,
    ...payload.relations.flatMap((item) => [item.peer, ...item.evidence].map((entry) => entry.source_uri ?? entityById.get(entry.id)?.source_uri)),
    ...payload.concept.definition_evidence.map((item) => item.source_uri)].filter(Boolean));
  return fitBudget(payload);
}

// Optional entries are dropped from the end, documents before relations, until
// the serialized response fits; the concept and its metadata are never dropped.
function fitBudget(payload) {
  const maximum = payload.budget.effective_max_bytes;
  while (outputBytes(payload) > maximum) {
    payload.budget.exhausted = true;
    if (payload.result_status === 'ok') payload.result_status = 'partial';
    if (payload.documents.length > 0) {
      payload.documents.pop();
      payload.budget.omitted_documents += 1;
    } else if (payload.relations.length > 0) {
      payload.relations.pop();
      payload.budget.omitted_relations += 1;
    } else if (payload.candidates.length > 1) {
      payload.candidates.pop();
      payload.budget.omitted_candidates += 1;
    } else {
      const gap = payload.coverage_gaps.findLastIndex((item) => item.reason !== 'coverage_gaps_summary');
      if (gap < 0) fail('budget_too_small', 'max_bytes cannot hold the concept and required metadata');
      payload.coverage_gaps.splice(gap, 1);
    }
  }
  payload.budget.used_bytes = outputBytes(payload);
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') !== payload.budget.used_bytes) {
    fail('budget_too_small', 'max_bytes cannot hold the concept and required metadata');
  }
  return payload;
}
