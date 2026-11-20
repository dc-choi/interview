import { ContextError, conceptSlug, inScope, labelKey, normalizeScopes, stableJson } from './core.mjs';
import { CLASS_BY_NAME, CONCEPT_TYPES, PREDICATES, PREDICATE_BY_NAME, hasCharacteristic, isA } from './schema.mjs';
import { LIMITATIONS, effectiveScopes, indexSync, outputBytes, queryRelevantGaps, scopedGaps } from './query.mjs';
import { getRepoState, listMarkdown, readBlobs } from './repository.mjs';
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
const namesOf = (concept) => [conceptSlug(concept.id), concept.label, ...concept.aliases];
const MATCH_KINDS = ['name', 'name_tokens', 'evidence_heading', 'evidence_text'];
// NFC, lowercase runs of Hangul or of other letters and digits, at least 2 characters long.
const tokensOf = (text) => [...new Set(text.normalize('NFC').toLowerCase()
  .match(/\p{Script=Hangul}+|[[\p{L}\p{N}]--\p{Script=Hangul}]+/gv) ?? [])].filter((token) => token.length >= 2);

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
    matches = concepts.filter((concept) => namesOf(concept).some((name) => labelKey(name) === termKey));
  }
  if (matches.length !== 1) {
    payload.result_status = matches.length === 0 ? 'concept_not_found' : 'ambiguous_concept';
    // Ambiguous candidates are the exact matches in id order. Not-found candidates are
    // suggestions, each with its match kind, and are never resolved automatically.
    const listed = matches.length > 0 ? matches.sort(byId).map((concept) => ({ concept }))
      : termKey.length >= 2 ? suggest(request.term, termKey, concepts,
        evidenceFields(concepts, relations, entityById, visible, options.repo, manifest.revision)) : [];
    payload.candidates = listed.slice(0, MAX_CANDIDATES).map(({ concept, match }) => ({ id: concept.id,
      type: concept.type, label: concept.label, aliases: concept.aliases, declared_in: concept.source_uri,
      ...(match ? { match } : {}) }));
    payload.budget.omitted_candidates = listed.length - payload.candidates.length;
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

// Heading paths and texts of the Sections supporting each concept: the supported_by
// targets of the concept and of the relation assertions linking it to another visible
// concept. As in the query above, an edge counts only when it is source confirmed and
// its asserting unit is in the allowlist, and so must the Section be. Only the pinned
// blobs of those Sections are read.
function evidenceFields(concepts, relations, entityById, visible, repo, revision) {
  const units = new Map(concepts.map((concept) => [concept.id, new Set()]));
  const supports = new Map();
  const links = [];
  for (const relation of relations) {
    const support = relation.predicate === 'supported_by';
    if ((!support && !(units.has(relation.subject) && units.has(relation.object)))
      || relation.verification !== 'source_confirmed' || !visible(entityById.get(relation.evidence_unit_id))) continue;
    if (support) append(supports, relation.subject, relation.object);
    else links.push(relation);
  }
  for (const [id, set] of units) for (const unit of supports.get(id) ?? []) set.add(unit);
  for (const link of links) {
    for (const unit of supports.get(link.evidence_unit_id) ?? []) {
      units.get(link.subject).add(unit);
      units.get(link.object).add(unit);
    }
  }
  const sections = new Map(concepts.map((concept) => [concept, [...units.get(concept.id)]
    .map((unit) => entityById.get(unit)).filter((unit) => visible(unit) && unit.type === 'Section' && unit.anchor)])
    .filter(([, list]) => list.length > 0));
  const paths = [...new Set([...sections.values()].flat().map((unit) => unit.source_uri))];
  const files = paths.length > 0 ? listMarkdown(repo, revision, paths) : [];
  if (files.length !== paths.length) fail('source_unavailable', 'cannot resolve every pinned document');
  const blobs = readBlobs(repo, files);
  const field = (read) => new Map([...sections].map(([concept, list]) => [concept, list.map(read)]));
  return [field((unit) => unit.anchor.heading_path.join(' ')),
    field((unit) => blobs.get(unit.source_uri).subarray(unit.anchor.start_byte, unit.anchor.end_byte).toString('utf8'))];
}

// A concept is suggested under its first matching kind: a slug, label or alias that
// contains the term or is contained in it on word boundaries, closest first by the
// shared length over the longer key (name); then a name (name_tokens), the heading path of a supporting
// Section (evidence_heading) or its text (evidence_text) that holds the whole term or
// enough of its tokens. A token matches a word starting with it, so a Korean particle
// does not hide it. A phrase or token found in the field of more concepts than one
// response lists cannot single one out and is ignored for that field. A token match
// needs at least half of the term's tokens and two of them (the only one of a
// one-token term). Name and name_tokens matches are ordered together by how many of
// the term's words the name holds; within a kind the whole term ranks first, then more
// shared tokens, then concept id.
function suggest(term, termKey, concepts, evidence) {
  const rank = new Map();
  const tokens = tokensOf(term);
  // Keys drop spaces, so containment alone crosses word boundaries ("econ" in
  // "..._seconds", "updates" in "update skip"): each word of the shorter side must start
  // a word of the longer side. A side without words (for example "c++") keeps plain containment.
  const whole = (inner, outer) => inner.length === 0
    || inner.every((token) => outer.some((word) => word.startsWith(token)));
  for (const concept of concepts) {
    const best = Math.max(0, ...namesOf(concept).map((name) => [labelKey(name), tokensOf(name)])
      .filter(([name, words]) => name.length >= 2 && ((name.includes(termKey) && whole(tokens, words))
        || (termKey.includes(name) && whole(words, tokens))))
      .map(([name]) => Math.min(name.length, termKey.length) / Math.max(name.length, termKey.length)));
    if (best > 0) rank.set(concept, [0, best]);
  }
  const needed = Math.max(Math.min(2, tokens.length), Math.ceil(tokens.length / 2));
  [new Map(concepts.map((concept) => [concept, namesOf(concept)])), ...evidence].forEach((field, index) => {
    const hits = new Map([...field].map(([concept, texts]) => [concept, texts.map((text) => {
      const words = tokensOf(text);
      // Names were matched on word boundaries above; a second, unaligned phrase test would bring "econ" in "seconds" back.
      return { phrase: index > 0 && tokens.length > 0 && labelKey(text).includes(termKey),
        tokens: tokens.filter((token) => words.some((word) => word.startsWith(token))) };
    })]));
    const common = (test) => [...hits.values()].filter((list) => list.some(test)).length > MAX_CANDIDATES;
    const phrase = !common((hit) => hit.phrase);
    const useful = tokens.filter((token) => !common((hit) => hit.tokens.includes(token)));
    for (const [concept, list] of hits) {
      const score = Math.max(0, ...list.map((hit) => phrase && hit.phrase ? tokens.length + 1
        : hit.tokens.filter((token) => useful.includes(token)).length));
      if (!rank.has(concept) && score > 0 && score >= needed) rank.set(concept, [index + 1, score]);
    }
  });
  // Among name matches the one holding more of the term's words comes first, so a broad
  // one-word Topic ("sqs") does not outrank a name holding every word of "SQS FIFO dedup".
  const cover = new Map([...rank].filter(([, [kind]]) => kind < 2).map(([concept]) => [concept, Math.max(0,
    ...namesOf(concept).map(tokensOf).map((words) => tokens.filter((token) => words.some((word) => word.startsWith(token))).length))]));
  const group = (kind) => Math.max(kind, 1);
  return [...rank].sort(([a, [kindA, scoreA]], [b, [kindB, scoreB]]) => group(kindA) - group(kindB)
    || (cover.get(b) ?? 0) - (cover.get(a) ?? 0) || kindA - kindB || scoreB - scoreA || byId(a, b))
    .map(([concept, [kind]]) => ({ concept, match: MATCH_KINDS[kind] }));
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
