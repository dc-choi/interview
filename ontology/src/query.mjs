import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  ContextError,
  inScope,
  normalizeScopes,
  sha256,
  stableJson,
} from './core.mjs';
import { getRepoState, readBlob } from './repository.mjs';
import { loadSnapshot } from './snapshot.mjs';

const MAX_ARGUMENT_BYTES = 8192;
const MAX_QUERY_BYTES = 4096;
const MAX_SCOPE_ENTRIES = 20;
const MAX_SCOPE_PATH_BYTES = 512;
const SERVER_MAX_BYTES = 65536;
const MAX_MATCHED_ENTITIES = 20;
const MAX_ROOTS = 6;
const MAX_EDGES_PER_ENTITY = 50;
const MAX_EXCERPT_BYTES = 1400;
const LIMITATIONS = [
  'freshness_not_checked',
  'semantic_conflict_not_checked',
  'runtime_not_checked',
];

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const byteLength = (value) => Buffer.byteLength(stableJson(value), 'utf8');

function outputBytes(payload) {
  const copy = JSON.parse(stableJson(payload));
  let previous = -1;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    copy.budget.used_bytes = previous < 0 ? 0 : previous;
    const next = Buffer.byteLength(JSON.stringify(copy), 'utf8');
    if (next === previous) return next;
    previous = next;
  }
  return previous;
}

function fail(code, message) {
  throw new ContextError(code, message);
}

function assertPlainObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('invalid_arguments', `${name} must be an object`);
  }
}

function validateOptions(options) {
  assertPlainObject(options, 'options');
  if (typeof options.repo !== 'string' || options.repo.length === 0) fail('invalid_options', 'repo is required');
  if (options.cacheDir !== undefined && (typeof options.cacheDir !== 'string' || options.cacheDir.length === 0)) fail('invalid_options', 'cacheDir must be a non-empty string when provided');
  if (!Array.isArray(options.allowlist)) fail('invalid_options', 'allowlist must be an array');
  return normalizeScopes(options.allowlist);
}

function validateArgs(args) {
  assertPlainObject(args, 'arguments');
  const allowed = new Set(['query', 'scope', 'depth', 'max_bytes']);
  for (const key of Object.keys(args)) if (!allowed.has(key)) fail('invalid_arguments', `unknown argument: ${key}`);
  if (byteLength(args) > MAX_ARGUMENT_BYTES) fail('arguments_too_large', `arguments exceed ${MAX_ARGUMENT_BYTES} bytes`);
  if (typeof args.query !== 'string' || args.query.trim().length === 0) fail('invalid_query', 'query must contain non-whitespace text');
  if (Buffer.byteLength(args.query, 'utf8') > MAX_QUERY_BYTES) fail('query_too_large', `query exceeds ${MAX_QUERY_BYTES} bytes`);
  if (own(args, 'scope')) {
    if (!Array.isArray(args.scope) || args.scope.length > MAX_SCOPE_ENTRIES) fail('invalid_scope', `scope has at most ${MAX_SCOPE_ENTRIES} entries`);
    for (const entry of args.scope) {
      if (typeof entry !== 'string' || Buffer.byteLength(entry, 'utf8') > MAX_SCOPE_PATH_BYTES) fail('invalid_scope', `scope paths have at most ${MAX_SCOPE_PATH_BYTES} bytes`);
    }
  }
  if (own(args, 'depth') && args.depth !== 1 && args.depth !== 2) fail('invalid_depth', 'depth must be 1 or 2');
  if (own(args, 'max_bytes') && (!Number.isInteger(args.max_bytes) || args.max_bytes <= 0)) fail('invalid_max_bytes', 'max_bytes must be a positive integer');
  return {
    query: args.query,
    scope: args.scope === undefined ? [] : normalizeScopes(args.scope),
    depth: args.depth ?? 1,
    requestedMaxBytes: args.max_bytes ?? SERVER_MAX_BYTES,
  };
}

function isPrefix(prefix, target) {
  return prefix === '.' || target === prefix || target.startsWith(`${prefix}/`);
}

function intersectScopes(left, right) {
  if (left.length === 0 || right.length === 0) return [];
  const result = new Set();
  for (const a of left) for (const b of right) {
    if (isPrefix(a, b)) result.add(b);
    else if (isPrefix(b, a)) result.add(a);
  }
  return [...result].sort();
}

function effectiveScopes(allowlist, indexedPaths, requested) {
  if (!indexedPaths?.length) return [];
  let scopes = intersectScopes(allowlist, normalizeScopes(indexedPaths));
  if (requested.length > 0) scopes = intersectScopes(scopes, requested);
  return scopes;
}

function sourcePath(entity) {
  return entity?.source_uri ?? entity?.source_path ?? '';
}

function documentIdFor(entity, documentsByPath) {
  if (entity.type === 'Document') return entity.id;
  if (entity.document_id) return entity.document_id;
  const doc = documentsByPath.get(sourcePath(entity));
  return doc?.id ?? null;
}

function preferredSection(sections) {
  return sections?.find((section) => isUsefulSection(section) && section.anchor?.heading_path?.length > 0)
    ?? sections?.find((section) => section.type === 'Section')
    ?? sections?.[0]
    ?? null;
}

function isUsefulSection(section) {
  const label = exactText(section?.label);
  return section?.type === 'Section' && !['출처', '관련 문서', '관련문서'].includes(label);
}

function words(value) {
  const stop = new Set(['이', '가', '은', '는', '을', '를', '에', '의', '와', '과', '도', '로', '으로', '에서', '하고', '하는', '대해', '관련', '무엇', '어떻게', '왜', '이후', '전체', '중', '유지', '방법', '경우', 'when', 'what', 'with', 'this', 'that', 'the', 'and', 'for', 'from']);
  const raw = value.toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) ?? [];
  const equivalents = new Map([
    ['재색인', ['reindex', 'alias', 'backfill']], ['커밋', ['commit']], ['발행', ['publish', 'event', 'outbox']],
    ['복구', ['recovery', 'reconcile', 'retry']], ['검색', ['search']],
  ]);
  const normalized = raw.flatMap((word) => {
    const stem = word.replace(/(하려면|하면|하나|인가|인가요|인가요|에서|으로|에게|까지|부터|처럼|보다|이후|중에|에는|에는|은|는|을|를|이|가|에)$/u, '');
    const base = stem.length >= 2 ? stem : word;
    return [base, ...(equivalents.get(base) ?? [])];
  });
  return [...new Set(normalized.filter((word) => !stop.has(word)))];
}

function exactText(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

function entityScore(entity, query, tokens) {
  const exact = exactText(query);
  const fields = [entity.id, entity.label, ...(entity.aliases ?? []), ...(entity.tags ?? []), entity.anchor?.heading_path?.join(' ')];
  const normalized = fields.map(exactText);
  if (exact.length > 0 && normalized.includes(exact)) return 1000;
  return matchingTokens(entity, tokens).length * 10;
}

function matchingTokens(entity, tokens) {
  const fields = [entity.id, entity.label, ...(entity.aliases ?? []), ...(entity.tags ?? []), entity.anchor?.heading_path?.join(' ')];
  const normalized = fields.map(exactText);
  return tokens.filter((token) => normalized.some((field) => field.includes(token)));
}

function discriminativeTokens(tokens, weights, documentFrequency) {
  const present = tokens.filter((token) => documentFrequency.get(token) > 0);
  if (present.length < 2) return [];
  const highestWeight = Math.max(...present.map((token) => weights.get(token)));
  if (highestWeight <= 1.2) return [];
  return present.filter((token) => weights.get(token) >= highestWeight * 0.8);
}

function hasDiscriminativeMatch(entry, tokens) {
  return tokens.length === 0 || tokens.some((token) => entry.matchedTokens.has(token));
}

function scoreBodyMatch(body, tokens, weights) {
  let score = 0;
  const matchedTokens = new Set();
  for (const token of tokens) {
    const first = body.indexOf(token);
    if (first === -1) continue;
    const count = body.indexOf(token, first + token.length) === -1 ? 1 : 2;
    matchedTokens.add(token);
    const translatedQueryTerm = ['reindex', 'alias', 'backfill', 'commit', 'publish', 'outbox', 'recovery', 'reconcile'].includes(token);
    score += count * 8 * weights.get(token) * (translatedQueryTerm ? 2 : 1);
  }
  return { score, matchedTokens };
}

function assertNoSymlink(repo, relativePath) {
  const parts = relativePath.split('/');
  let cursor = repo;
  for (const part of parts) {
    cursor = path.join(cursor, part);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) fail('symlink_path', `symlink path is not allowed: ${relativePath}`);
    } catch (error) {
      if (error instanceof ContextError) throw error;
      if (error?.code !== 'ENOENT') throw error;
      return;
    }
  }
}

function safeExcerpt(buffer, start, end, limit) {
  const source = buffer.subarray(Math.max(0, start), Math.min(buffer.length, end));
  if (source.length <= limit) return { excerpt: source.toString('utf8'), truncated: false };
  let length = Math.min(limit, source.length);
  while (length > 0) {
    const candidate = source.subarray(0, length);
    const text = candidate.toString('utf8');
    if (Buffer.from(text, 'utf8').equals(candidate)) return { excerpt: text, truncated: true };
    length -= 1;
  }
  return { excerpt: '', truncated: true };
}

function readPinnedBlobs(repo, revision, paths) {
  for (const sourcePath of paths) assertNoSymlink(repo, sourcePath);
  const child = spawnSync('git', ['-C', repo, 'cat-file', '--batch'], {
    input: paths.map((sourcePath) => `${revision}:${sourcePath}`).join('\n') + '\n',
    encoding: null,
    env: {
      ...globalThis.process.env,
      GIT_OPTIONAL_LOCKS: '0',
      GIT_NO_REPLACE_OBJECTS: '1',
      LC_ALL: 'C',
    },
    maxBuffer: 128 * 1024 * 1024,
    timeout: 60000,
  });
  if (child.status !== 0 || child.error) fail('source_unavailable', 'cannot read pinned source blobs');
  const blobs = new Map();
  let offset = 0;
  for (const sourcePath of paths) {
    const newline = child.stdout.indexOf(10, offset);
    if (newline < 0) fail('source_unavailable', 'invalid pinned source blob');
    const [, type, size] = child.stdout.subarray(offset, newline).toString('utf8').split(' ');
    const length = Number(size);
    if (type !== 'blob' || !Number.isSafeInteger(length) || length < 0 || newline + length + 2 > child.stdout.length) {
      fail('source_unavailable', 'invalid pinned source blob');
    }
    blobs.set(sourcePath, child.stdout.subarray(newline + 1, newline + 1 + length));
    offset = newline + length + 2;
  }
  return blobs;
}

function normalizedHash(value) {
  return String(value ?? '').replace(/^sha256:/, '');
}

function evidenceFor(entity, read, scopes) {
  const uri = sourcePath(entity);
  if (!uri || !inScope(uri, scopes)) return null;
  const anchor = entity.anchor;
  if (!anchor || !Number.isInteger(anchor.start_byte) || !Number.isInteger(anchor.end_byte)) return null;
  const blob = read(uri);
  const raw = blob.subarray(anchor.start_byte, anchor.end_byte);
  if (normalizedHash(entity.content_hash) !== sha256(raw)) return null;
  const snippet = safeExcerpt(blob, anchor.start_byte, anchor.end_byte, MAX_EXCERPT_BYTES);
  return {
    id: entity.id,
    source_uri: uri,
    anchor: {
      heading_path: anchor.heading_path ?? [],
      occurrence: anchor.occurrence,
      start_line: anchor.start_line,
      end_line: anchor.end_line,
      start_byte: anchor.start_byte,
      end_byte: anchor.end_byte,
    },
    source_revision: entity.source_revision,
    content_hash: entity.content_hash,
    excerpt: snippet.excerpt,
    truncated: snippet.truncated,
  };
}

function publicEntity(entity) {
  const { content_hash, anchor, source_updated_at, source_revision, source_uri, document_id, ...rest } = entity;
  return rest;
}

function addEvidenceWithinBudget(payload, item, maximum, reservedBytes = 0) {
  const fits = (candidate) => {
    payload.evidence_units.push(candidate);
    const okay = outputBytes(payload) + reservedBytes <= maximum;
    payload.evidence_units.pop();
    return okay;
  };
  if (fits(item)) {
    payload.evidence_units.push(item);
    return true;
  }
  const characters = [...item.excerpt];
  let low = 1;
  let high = characters.length;
  let best = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = { ...item, excerpt: characters.slice(0, middle).join(''), truncated: true };
    if (fits(candidate)) {
      best = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (!best) return false;
  payload.evidence_units.push(best);
  return true;
}

function addRelationBundleWithinBudget(payload, relation, entities, item, maximum) {
  const entityIds = new Set(payload.entities.map((entity) => entity.id));
  const evidenceIds = new Set(payload.evidence_units.map((evidence) => evidence.id));
  const additions = entities.filter((entity) => !entityIds.has(entity.id));
  const entityLength = payload.entities.length;
  const evidenceLength = payload.evidence_units.length;
  payload.entities.push(...additions.map(publicEntity));
  if (!evidenceIds.has(item.id)) payload.evidence_units.push(item);
  payload.relations.push(relation);
  if (outputBytes(payload) <= maximum) return true;
  payload.entities.length = entityLength;
  payload.evidence_units.length = evidenceLength;
  payload.relations.pop();
  return false;
}

function indexSync(manifest, current, scopes, errors, requestedScopeIndexed) {
  let status = 'synced';
  if (current.dirty) status = 'unindexed_worktree';
  else if (current.revision !== manifest.revision) status = 'revision_mismatch';
  const syncErrors = [...errors];
  if (current.dirty) syncErrors.push('unindexed_worktree');
  if (current.revision !== manifest.revision) syncErrors.push('revision_mismatch');
  return [{
    source_id: manifest.source_id,
    status,
    revision: manifest.revision,
    fingerprint: manifest.fingerprint,
    manifest_hash: manifest.manifest_hash,
    artifacts_verified: true,
    requested_scope_indexed: requestedScopeIndexed,
    indexed_paths: manifest.indexed_paths ?? [],
    excluded_paths: manifest.excluded_paths ?? [],
    schema_version: manifest.schema_version,
    extractor_version: manifest.extractor_version,
    completed: manifest.completed,
    errors: syncErrors,
  }];
}

function appendGap(gaps, gap) {
  if (!gaps.some((entry) => stableJson(entry) === stableJson(gap))) gaps.push(gap);
}

function boundedGaps(gaps, sourceId, scopes, maximum = 8) {
  const sorted = [...gaps].sort((a, b) => stableJson(a).localeCompare(stableJson(b)));
  if (sorted.length <= maximum) return sorted;
  return [
    ...sorted.slice(0, maximum),
    { source_id: sourceId, scope: scopes, reason: 'coverage_gaps_omitted', total_matching: sorted.length, returned: maximum },
  ];
}

function queryRelevantGaps(allGaps, roots, sourceId, scopes) {
  const paths = new Set(roots.map((root) => sourcePath(root.doc)));
  const relevant = allGaps.filter((gap) => !gap.source_uri || paths.has(gap.source_uri));
  const returned = boundedGaps(relevant, sourceId, scopes);
  returned.push({
    source_id: sourceId,
    scope: scopes,
    reason: 'coverage_gaps_summary',
    total_in_scope: allGaps.length,
    related_to_retrieval: relevant.length,
  });
  return returned;
}

function pruneOrphans(payload, directEvidenceToDocument, ownerDocumentForEntity) {
  const entityIds = new Set(payload.entities.map((entity) => entity.id));
  const referencedEvidence = new Set(payload.relations.map((relation) => relation.evidence_unit_id));
  const directEvidence = payload.evidence_units.filter((item) => {
    const documentId = directEvidenceToDocument.get(item.id);
    return documentId && entityIds.has(documentId);
  });
  const keepEvidence = new Set([...referencedEvidence, ...directEvidence.map((item) => item.id)]);
  const evidenceLength = payload.evidence_units.length;
  payload.evidence_units = payload.evidence_units.filter((item) => keepEvidence.has(item.id));
  const directDocuments = new Set(payload.evidence_units
    .filter((item) => directEvidenceToDocument.has(item.id))
    .map((item) => directEvidenceToDocument.get(item.id)));
  const relationEntities = new Set(payload.relations.flatMap((relation) => [relation.subject, relation.object]));
  const relationOwners = new Set([...relationEntities]
    .map((entityId) => ownerDocumentForEntity.get(entityId))
    .filter(Boolean));
  payload.entities = payload.entities.filter((entity) => directDocuments.has(entity.id)
    || relationEntities.has(entity.id) || relationOwners.has(entity.id));
  return evidenceLength - payload.evidence_units.length;
}

function trimToBudget(payload, maximum, directEvidenceToDocument, ownerDocumentForEntity) {
  let changed = false;
  const directIds = new Set(directEvidenceToDocument.keys());
  const removeAt = (items, index) => {
    if (index < 0) return false;
    items.splice(index, 1);
    changed = true;
    return true;
  };
  while (outputBytes(payload) > maximum) {
    if (payload.relations.length > 0) {
      payload.relations.pop();
      payload.budget.omitted_relations += 1;
      payload.budget.omitted_evidence_units += pruneOrphans(payload, directEvidenceToDocument, ownerDocumentForEntity);
      changed = true;
      continue;
    }
    const directDocuments = new Set(payload.evidence_units
      .filter((item) => directIds.has(item.id))
      .map((item) => directEvidenceToDocument.get(item.id)));
    const unusedEntity = payload.entities.findLastIndex((entity) => !directDocuments.has(entity.id));
    if (removeAt(payload.entities, unusedEntity)) {
      payload.budget.omitted_evidence_units += pruneOrphans(payload, directEvidenceToDocument, ownerDocumentForEntity);
      continue;
    }
    const relationEvidence = new Set(payload.relations.map((relation) => relation.evidence_unit_id));
    const indirectEvidence = payload.evidence_units.findLastIndex((item) => !directIds.has(item.id) && !relationEvidence.has(item.id));
    if (removeAt(payload.evidence_units, indirectEvidence)) {
      payload.budget.omitted_evidence_units += 1;
      continue;
    }
    const directEvidence = payload.evidence_units.filter((item) => directIds.has(item.id));
    if (directEvidence.length > 1) {
      const item = directEvidence.at(-1);
      const index = payload.evidence_units.findLastIndex((candidate) => candidate.id === item.id);
      payload.evidence_units.splice(index, 1);
      payload.budget.omitted_evidence_units += 1;
      payload.budget.omitted_evidence_units += pruneOrphans(payload, directEvidenceToDocument, ownerDocumentForEntity);
      changed = true;
      continue;
    }
    const removableGap = payload.coverage_gaps.findLastIndex((gap) => gap.reason !== 'coverage_gaps_summary');
    if (removeAt(payload.coverage_gaps, removableGap)) continue;
    return false;
  }
  if (changed) payload.budget.exhausted = true;
  return true;
}

/**
 * Build an evidence-backed Context Pack from the active immutable snapshot.
 * This intentionally does not infer claims or semantic relations.
 */
export function lookup(options, args, snapshot) {
  const allowlist = validateOptions(options);
  const request = validateArgs(args);
  const effectiveMaxBytes = Math.min(request.requestedMaxBytes, SERVER_MAX_BYTES);
  snapshot ??= loadSnapshot({ repo: options.repo, cacheDir: options.cacheDir });
  const { manifest, entities, relations, fingerprint, manifest_hash: manifestHash } = snapshot;
  const scopes = effectiveScopes(allowlist, manifest.indexed_paths, request.scope);
  const requestedScopeIndexed = request.scope.length === 0
    ? scopes.length > 0
    : request.scope.every((scope) => scopes.some((effective) => isPrefix(effective, scope)));
  const current = getRepoState(options.repo);
  const gaps = boundedGaps(
    [...(manifest.coverage_gaps ?? [])].filter((gap) => !gap.source_uri || inScope(gap.source_uri, scopes)),
    manifest.source_id,
    scopes,
  );
  const errors = requestedScopeIndexed ? [] : ['requested_scope_not_indexed'];
  if (!requestedScopeIndexed) appendGap(gaps, {
    source_id: manifest.source_id, scope: request.scope, reason: 'requested_scope_not_indexed',
  });
  const sync = indexSync({ ...manifest, fingerprint, manifest_hash: manifestHash }, current, scopes, errors, requestedScopeIndexed);
  const base = {
    query: request.query,
    result_status: 'insufficient_evidence',
    index_sync: sync,
    entities: [],
    evidence_units: [],
    relations: [],
    conflict_check_status: 'not_supported',
    conflicts: null,
    coverage_gaps: gaps,
    limitations: LIMITATIONS,
    matching: { query_term_count: 0, max_section_term_matches: 0, assessment: 'not_evaluated' },
    traversal: { depth: request.depth, max_matched_entities: MAX_MATCHED_ENTITIES, max_edges_per_entity: MAX_EDGES_PER_ENTITY, limit_reached: false },
    budget: {
      requested_max_bytes: request.requestedMaxBytes,
      server_max_bytes: SERVER_MAX_BYTES,
      effective_max_bytes: effectiveMaxBytes,
      used_bytes: 0,
      exhausted: false,
      omitted_evidence_units: 0,
      omitted_relations: 0,
    },
  };
  const finalize = () => {
    base.coverage_gaps = boundedGaps(base.coverage_gaps, manifest.source_id, scopes);
    base.budget.used_bytes = outputBytes(base);
    if (base.budget.used_bytes > effectiveMaxBytes) fail('budget_too_small', 'max_bytes cannot hold required result metadata');
    const actual = Buffer.byteLength(JSON.stringify(base), 'utf8');
    if (actual !== base.budget.used_bytes || actual > effectiveMaxBytes) fail('budget_too_small', 'max_bytes cannot hold required result metadata');
    return base;
  };
  if (scopes.length === 0) return finalize();

  const documents = entities.filter((entity) => entity.type === 'Document' && inScope(sourcePath(entity), scopes));
  const documentsByPath = new Map(documents.map((entity) => [sourcePath(entity), entity]));
  const sections = entities.filter((entity) => (entity.type === 'Section' || entity.type === 'RelationAssertion') && inScope(sourcePath(entity), scopes));
  const searchableSections = sections.filter(isUsefulSection);
  const sectionsById = new Map(sections.map((entity) => [entity.id, entity]));
  const entitiesById = new Map([...documents, ...sections].map((entity) => [entity.id, entity]));
  const ownerDocumentForEntity = new Map([...entitiesById.values()]
    .map((entity) => [entity.id, documentIdFor(entity, documentsByPath)])
    .filter(([, documentId]) => documentId));
  const byDocument = new Map();
  for (const section of searchableSections) {
    const id = documentIdFor(section, documentsByPath);
    if (!id) continue;
    const group = byDocument.get(id) ?? [];
    group.push(section);
    byDocument.set(id, group);
  }
  const memo = new Map();
  const read = (uri) => {
    if (!memo.has(uri)) {
      assertNoSymlink(options.repo, uri);
      memo.set(uri, readBlob(options.repo, manifest.revision, uri));
    }
    return memo.get(uri);
  };
  const tokens = words(request.query);
  const scoreSection = (section, weights) => {
    const body = read(sourcePath(section)).subarray(section.anchor?.start_byte ?? 0, section.anchor?.end_byte ?? 0).toString('utf8').toLowerCase();
    const match = scoreBodyMatch(body, tokens, weights);
    // Long notes can repeat broad terms without answering the specific query.
    const lengthPenalty = 1 + 0.2 * Math.log1p(body.length / 200);
    return { ...match, score: entityScore(section, request.query, tokens) + match.score / lengthPenalty };
  };
  base.matching.query_term_count = tokens.length;
  let maxSectionTermMatches = 0;
  const scored = new Map();
  const sectionScores = new Map();
  for (const doc of documents) {
    const score = entityScore(doc, request.query, tokens);
    if (score > 0) scored.set(doc.id, {
      doc,
      score,
      direct: null,
      metadataMatch: score === 1000,
      matchedTokens: new Set(matchingTokens(doc, tokens)),
    });
  }
  for (const section of sections) {
    const docId = documentIdFor(section, documentsByPath);
    const doc = documentsByPath.get(sourcePath(section));
    if (!docId || !doc) continue;
    const score = entityScore(section, request.query, tokens);
    const useful = isUsefulSection(section);
    sectionScores.set(section.id, useful || section.type === 'RelationAssertion' ? score : 0);
    if (useful) {
      maxSectionTermMatches = Math.max(maxSectionTermMatches, matchingTokens(section, tokens).length);
    }
    const existing = scored.get(docId);
    if (existing) for (const token of matchingTokens(section, tokens)) existing.matchedTokens.add(token);
    if (score > 0 && (!existing || existing.score < score)) {
      scored.set(docId, {
        doc,
        score,
        direct: section,
        metadataMatch: score === 1000 || existing?.metadataMatch === true,
        matchedTokens: new Set([...(existing?.matchedTokens ?? []), ...matchingTokens(section, tokens)]),
      });
    }
  }
  const hasExactMetadataHit = [...documents, ...searchableSections]
    .some((entity) => entityScore(entity, request.query, tokens) === 1000);
  // A single exact title or alias needs no broad scan. Multi-term questions use
  // one pinned Git batch to distinguish specific terms from generic ones.
  const scanBodies = tokens.length > 0 && (!hasExactMetadataHit || tokens.length > 1);
  if (scanBodies) {
    for (const [uri, blob] of readPinnedBlobs(options.repo, manifest.revision, documents.map(sourcePath))) memo.set(uri, blob);
    const documentBodies = [...memo.values()].map((blob) => blob.toString('utf8').toLowerCase());
    const documentFrequency = new Map(tokens.map((token) => [token,
      documentBodies.reduce((count, body) => count + Number(body.includes(token)), 0)]));
    const weights = new Map(tokens.map((token) => [token,
      1 + Math.log((documents.length + 1) / ((documentFrequency.get(token) ?? 0) + 1))]));
    for (const section of searchableSections) {
      const docId = documentIdFor(section, documentsByPath);
      const doc = documentsByPath.get(sourcePath(section));
      if (!docId || !doc) continue;
      const bodyMatch = scoreSection(section, weights);
      maxSectionTermMatches = Math.max(maxSectionTermMatches,
        new Set([...matchingTokens(section, tokens), ...bodyMatch.matchedTokens]).size);
      const score = bodyMatch.score;
      sectionScores.set(section.id, score);
      const existing = scored.get(docId);
      if (existing) for (const token of bodyMatch.matchedTokens) existing.matchedTokens.add(token);
      if (score > 0 && (!existing || existing.score < score)) {
        scored.set(docId, {
          doc,
          score,
          direct: section,
          metadataMatch: existing?.metadataMatch ?? false,
          matchedTokens: new Set([...(existing?.matchedTokens ?? []), ...bodyMatch.matchedTokens]),
        });
      }
    }
    const discriminative = tokens.length >= 2 && tokens.length <= 3
      ? discriminativeTokens(tokens, weights, documentFrequency)
      : [];
    if (discriminative.length > 0) {
      for (const [id, entry] of scored) {
        if (!hasDiscriminativeMatch(entry, discriminative)) scored.delete(id);
      }
    }
  }
  base.matching.max_section_term_matches = maxSectionTermMatches;
  base.matching.assessment = maxSectionTermMatches > 0 ? 'lexical_overlap' : 'no_lexical_overlap';
  if (hasExactMetadataHit) base.matching.assessment = 'exact_metadata';
  else if (tokens.length >= 8 && maxSectionTermMatches > 0 && maxSectionTermMatches <= 2) {
    base.matching.assessment = 'weak_lexical_overlap';
  }
  const roots = [...scored.values()].sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id));
  if (roots.length > MAX_ROOTS) {
    roots.length = MAX_ROOTS;
    base.traversal.limit_reached = true;
    appendGap(gaps, { source_id: manifest.source_id, scope: scopes, reason: 'retrieval_limit_reached' });
  }
  const initialGaps = [...(manifest.coverage_gaps ?? [])].filter((gap) => !gap.source_uri || inScope(gap.source_uri, scopes));
  const scopeErrors = base.coverage_gaps.filter((gap) => gap.reason === 'requested_scope_not_indexed');
  const traversalGaps = gaps.filter((gap) => gap.reason === 'retrieval_limit_reached');
  base.coverage_gaps = [...queryRelevantGaps(initialGaps, roots, manifest.source_id, scopes), ...scopeErrors, ...traversalGaps];
  const selected = new Map(roots.map((entry) => [entry.doc.id, entry.doc]));
  const queue = roots.map((entry) => ({ id: entry.doc.id, hop: 0 }));
  for (const root of roots) {
    if (root.direct && !selected.has(root.direct.id) && selected.size < MAX_MATCHED_ENTITIES) {
      selected.set(root.direct.id, root.direct);
      queue.push({ id: root.direct.id, hop: 0 });
    }
  }
  const selectedRelations = [];
  const seenRelations = new Set();
  const rankedEvidence = new Set();
  // Exact single-term lookups only need local evidence bodies. A unit weight
  // keeps their ranking independent of unrelated documents and root selection.
  const localWeights = new Map(tokens.map((token) => [token, 1]));
  while (queue.length > 0) {
    const { id, hop } = queue.shift();
    if (hop >= request.depth) continue;
    const relatedDocumentScore = (relation) => {
      const peer = relation.subject === id ? relation.object : relation.subject;
      return scored.get(ownerDocumentForEntity.get(peer))?.score ?? 0;
    };
    // The section explaining a link can be more useful than the peer's other text.
    // Rank that evidence before spending the bounded graph and response budgets.
    const incident = relations.filter((relation) => {
      if ((relation.subject !== id && relation.object !== id) || relation.verification !== 'source_confirmed' || relation.predicate === 'contains') return false;
      const evidence = sectionsById.get(relation.evidence_unit_id);
      const subject = entitiesById.get(relation.subject);
      const object = entitiesById.get(relation.object);
      return evidence && subject && object && inScope(sourcePath(evidence), scopes)
        && inScope(sourcePath(subject), scopes) && inScope(sourcePath(object), scopes);
    });
    if (!scanBodies && tokens.length > 0) {
      const pending = [...new Set(incident.map((relation) => relation.evidence_unit_id))]
        .filter((evidenceId) => !rankedEvidence.has(evidenceId))
        .map((evidenceId) => sectionsById.get(evidenceId)).filter(isUsefulSection);
      const paths = [...new Set(pending.map(sourcePath))].filter((uri) => !memo.has(uri));
      if (paths.length > 0) {
        for (const [uri, blob] of readPinnedBlobs(options.repo, manifest.revision, paths)) memo.set(uri, blob);
      }
      for (const section of pending) {
        sectionScores.set(section.id, scoreSection(section, localWeights).score);
        rankedEvidence.add(section.id);
      }
    }
    incident.sort((a, b) => (sectionScores.get(b.evidence_unit_id) ?? 0) - (sectionScores.get(a.evidence_unit_id) ?? 0)
      || relatedDocumentScore(b) - relatedDocumentScore(a) || a.id.localeCompare(b.id));
    if (incident.length > MAX_EDGES_PER_ENTITY) {
      base.traversal.limit_reached = true;
      appendGap(base.coverage_gaps, { source_id: manifest.source_id, scope: scopes, reason: 'retrieval_limit_reached' });
    }
    for (const relation of incident.slice(0, MAX_EDGES_PER_ENTITY)) {
      const peer = relation.subject === id ? relation.object : relation.subject;
      const peerEntity = entitiesById.get(peer);
      if (!peerEntity) continue;
      if (!selected.has(peer)) {
        const additions = [peerEntity];
        const ownerId = documentIdFor(peerEntity, documentsByPath);
        const owner = ownerId ? entitiesById.get(ownerId) : null;
        if (owner && !selected.has(owner.id)) additions.push(owner);
        if (selected.size + additions.length > MAX_MATCHED_ENTITIES) {
          base.traversal.limit_reached = true;
          appendGap(base.coverage_gaps, { source_id: manifest.source_id, scope: scopes, reason: 'retrieval_limit_reached' });
          continue;
        } else {
          for (const entity of additions) selected.set(entity.id, entity);
          queue.push({ id: peer, hop: hop + 1 });
        }
      }
      if (!seenRelations.has(relation.id)) {
        seenRelations.add(relation.id);
        selectedRelations.push(relation);
      }
    }
  }

  const evidenceCache = new Map();
  const evidence = (id) => {
    if (!evidenceCache.has(id)) evidenceCache.set(id, evidenceFor(sectionsById.get(id), read, scopes));
    return evidenceCache.get(id);
  };
  const markOutputLimit = () => {
    base.budget.exhausted = true;
    appendGap(base.coverage_gaps, { source_id: manifest.source_id, scope: scopes, reason: 'output_limit_reached' });
  };
  const omittedEvidenceIds = new Set();
  const omitEvidence = (id) => {
    if (!omittedEvidenceIds.has(id) && !base.evidence_units.some((item) => item.id === id)) {
      omittedEvidenceIds.add(id);
      base.budget.omitted_evidence_units += 1;
    }
  };
  const restoreEvidence = (id) => {
    if (omittedEvidenceIds.delete(id)) base.budget.omitted_evidence_units -= 1;
  };
  const includedRootIds = new Set();
  for (const root of roots) {
    const entity = publicEntity(root.doc);
    base.entities.push(entity);
    if (outputBytes(base) > effectiveMaxBytes) {
      base.entities.pop();
      markOutputLimit();
      continue;
    }
    includedRootIds.add(root.doc.id);
  }
  const directEvidence = [];
  const rootForEvidence = new Map();
  for (const root of roots) {
    if (!includedRootIds.has(root.doc.id)) continue;
    if (root.metadataMatch) {
      const rootSection = byDocument.get(root.doc.id)?.find((section) => section.type === 'Section' && section.anchor?.heading_path?.length === 0);
      if (rootSection) {
        directEvidence.push(rootSection.id);
        rootForEvidence.set(rootSection.id, root.doc.id);
      }
    }
    const section = root.direct ?? preferredSection(byDocument.get(root.doc.id));
    if (section) {
      directEvidence.push(section.id);
      rootForEvidence.set(section.id, root.doc.id);
    }
  }
  for (const id of new Set(directEvidence)) {
    const item = evidence(id);
    if (!item) {
      appendGap(base.coverage_gaps, { source_id: manifest.source_id, scope: scopes, reason: 'source_unavailable', evidence_unit_id: id });
      continue;
    }
    if (!addEvidenceWithinBudget(base, item, effectiveMaxBytes)) {
      markOutputLimit();
      omitEvidence(id);
      continue;
    }
    restoreEvidence(id);
  }
  if (roots.length > 0 && base.evidence_units.length === 0) fail('budget_too_small', 'max_bytes cannot hold a direct evidence unit');
  for (const relation of selectedRelations) {
    const item = evidence(relation.evidence_unit_id);
    const endpoints = [entitiesById.get(relation.subject), entitiesById.get(relation.object)];
    if (!item || endpoints.some((entity) => !entity)) {
      appendGap(base.coverage_gaps, { source_id: manifest.source_id, scope: scopes, reason: 'source_unavailable', evidence_unit_id: relation.evidence_unit_id });
      base.budget.omitted_relations += 1;
      continue;
    }
    const bundleEntities = new Map(endpoints.map((entity) => [entity.id, entity]));
    for (const endpoint of endpoints) {
      const ownerId = documentIdFor(endpoint, documentsByPath);
      const owner = ownerId ? entitiesById.get(ownerId) : null;
      if (owner) bundleEntities.set(owner.id, owner);
    }
    if (!addRelationBundleWithinBudget(base, relation, [...bundleEntities.values()], item, effectiveMaxBytes)) {
      base.budget.omitted_relations += 1;
      omitEvidence(relation.evidence_unit_id);
      markOutputLimit();
      continue;
    }
    restoreEvidence(relation.evidence_unit_id);
  }
  const survivingDirect = base.evidence_units.filter((item) => rootForEvidence.has(item.id));
  if (roots.length > 0 && survivingDirect.length === 0) {
    fail('budget_too_small', 'max_bytes cannot hold a direct evidence unit with its document');
  }
  base.result_status = survivingDirect.length > 0 ? 'ok' : 'insufficient_evidence';
  if (base.budget.exhausted || base.traversal.limit_reached) {
    base.result_status = base.evidence_units.length > 0 ? 'partial' : 'insufficient_evidence';
    if (base.traversal.limit_reached) appendGap(base.coverage_gaps, { source_id: manifest.source_id, scope: scopes, reason: 'retrieval_limit_reached' });
  }
  const directEvidenceToDocument = new Map([...rootForEvidence.entries()]
    .filter(([id]) => base.evidence_units.some((item) => item.id === id)));
  if (!trimToBudget(base, effectiveMaxBytes, directEvidenceToDocument, ownerDocumentForEntity)) {
    fail('budget_too_small', 'max_bytes cannot hold a direct evidence unit with required metadata');
  }
  if (base.budget.exhausted) {
    base.result_status = base.evidence_units.length > 0 ? 'partial' : 'insufficient_evidence';
    if (!trimToBudget(base, effectiveMaxBytes, directEvidenceToDocument, ownerDocumentForEntity)) {
      fail('budget_too_small', 'max_bytes cannot hold a direct evidence unit with required metadata');
    }
  }
  return finalize();
}
