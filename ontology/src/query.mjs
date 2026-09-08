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
import { getRepoState, listMarkdown, readBlob, readBlobs } from './repository.mjs';
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
const MAX_SEARCH_DOCUMENTS = 20;
const MAX_CURSOR_BYTES = 2048;
const LINK_ROLE_PRIORITY = { index_member: 2, parent_index: 2, related_document: 1 };
const QUERY_CODE_HASH = sha256(fs.readFileSync(new URL(import.meta.url)));
const LIMITATIONS = [
  'freshness_not_checked',
  'semantic_conflict_not_checked',
  'runtime_not_checked',
];

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const byteLength = (value) => Buffer.byteLength(stableJson(value), 'utf8');

function outputBytes(payload) {
  const copy = { ...payload, budget: { ...payload.budget, used_bytes: 0 } };
  const fixedBytes = Buffer.byteLength(JSON.stringify(copy), 'utf8') - 1;
  let size = fixedBytes + 1;
  // Only the decimal width of used_bytes changes after this serialization.
  for (;;) {
    const next = fixedBytes + String(size).length;
    if (next === size) return size;
    size = next;
  }
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
  const allowed = new Set(['query', 'scope', 'depth', 'max_bytes', 'conditions']);
  for (const key of Object.keys(args)) if (!allowed.has(key)) fail('invalid_arguments', `unknown argument: ${key}`);
  if (byteLength(args) > MAX_ARGUMENT_BYTES) fail('arguments_too_large', `arguments exceed ${MAX_ARGUMENT_BYTES} bytes`);
  if (typeof args.query !== 'string' || args.query.trim().length === 0) fail('invalid_query', 'query must contain non-whitespace text');
  if (Buffer.byteLength(args.query, 'utf8') > MAX_QUERY_BYTES) fail('query_too_large', `query exceeds ${MAX_QUERY_BYTES} bytes`);
  if (own(args, 'conditions')) {
    if (!Array.isArray(args.conditions) || args.conditions.length < 1 || args.conditions.length > 3
      || args.conditions.some((condition) => typeof condition !== 'string' || words(condition).length === 0
        || Buffer.byteLength(condition, 'utf8') > 1024)) {
      fail('invalid_conditions', 'conditions must contain 1 to 3 non-empty search queries of at most 1024 bytes each');
    }
  }
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
    conditions: args.conditions ?? [],
    scope: args.scope === undefined ? [] : normalizeScopes(args.scope),
    depth: args.depth ?? 1,
    requestedMaxBytes: args.max_bytes ?? SERVER_MAX_BYTES,
  };
}

function validateSearchArgs(args) {
  assertPlainObject(args, 'arguments');
  for (const key of Object.keys(args)) {
    if (!['query', 'scope', 'max_bytes', 'cursor'].includes(key)) fail('invalid_arguments', `unknown argument: ${key}`);
  }
  const { cursor, ...queryArgs } = args;
  const request = validateArgs(queryArgs);
  if (own(args, 'cursor') && (typeof cursor !== 'string' || cursor.length === 0
    || Buffer.byteLength(cursor, 'utf8') > MAX_CURSOR_BYTES || !/^[A-Za-z0-9_-]+$/.test(cursor))) {
    fail('invalid_cursor', 'cursor must be a bounded continuation token');
  }
  return { ...request, cursor };
}

function searchOffset(cursor, binding, total) {
  if (cursor === undefined) return 0;
  let value;
  try {
    const bytes = Buffer.from(cursor, 'base64url');
    if (bytes.toString('base64url') !== cursor) throw new Error('noncanonical cursor');
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail('invalid_cursor', 'cannot decode cursor');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== 2 || !own(value, 'offset') || !own(value, 'binding')
    || !Number.isSafeInteger(value.offset) || value.offset < 0
    || typeof value.binding !== 'string' || !/^[a-f0-9]{64}$/.test(value.binding)) {
    fail('invalid_cursor', 'invalid cursor fields');
  }
  if (value.binding !== binding) fail('cursor_mismatch', 'query, scope, snapshot or ranking code changed; restart the search');
  if (value.offset >= total) fail('invalid_cursor', 'cursor is outside the candidate range');
  return value.offset;
}

function documentSearchPage({ base, request, roots, byDocument, scopes, tokens = [] }) {
  const source = base.index_sync[0];
  const binding = sha256(stableJson({
    query: request.query, scopes, fingerprint: source.fingerprint,
    manifest_hash: source.manifest_hash, ranking_code: QUERY_CODE_HASH,
  }));
  const offset = searchOffset(request.cursor, binding, roots.length);
  const payload = {
    query: request.query,
    result_status: 'insufficient_evidence',
    index_sync: base.index_sync,
    matching: { ...base.matching, query_terms: tokens },
    candidates: [],
    coverage_gaps: base.coverage_gaps,
    limitations: base.limitations,
    pagination: {},
    budget: {
      requested_max_bytes: base.budget.requested_max_bytes,
      server_max_bytes: base.budget.server_max_bytes,
      effective_max_bytes: base.budget.effective_max_bytes,
      used_bytes: 0,
      exhausted: false,
    },
  };
  const updatePage = () => {
    const next = offset + payload.candidates.length;
    const complete = next === roots.length;
    payload.pagination = {
      offset_documents: offset,
      returned_documents: payload.candidates.length,
      total_candidates: roots.length,
      complete,
      next_cursor: complete ? null : Buffer.from(JSON.stringify({ offset: next, binding })).toString('base64url'),
    };
    payload.result_status = complete ? 'ok' : 'partial';
    if (payload.candidates.length === 0) payload.result_status = 'insufficient_evidence';
  };
  for (const entry of roots.slice(offset, offset + MAX_SEARCH_DOCUMENTS)) {
    const unit = entry.direct ?? preferredSection(byDocument.get(entry.doc.id));
    const reference = unit ? {
      id: unit.id, type: unit.type, label: unit.label,
      source_uri: sourcePath(unit), source_revision: unit.source_revision,
      content_hash: unit.content_hash, anchor: unit.anchor,
    } : null;
    payload.candidates.push({
      document: publicEntity(entry.doc),
      source_uri: sourcePath(entry.doc),
      matched_terms: tokens.filter((token) => entry.matchedTokens.has(token)),
      best_evidence_ref: reference,
    });
    updatePage();
    if (outputBytes(payload) > payload.budget.effective_max_bytes) {
      payload.candidates.pop();
      payload.budget.exhausted = true;
      break;
    }
  }
  updatePage();
  if (offset < roots.length && payload.candidates.length === 0) {
    fail('budget_too_small', 'max_bytes cannot hold one document candidate');
  }
  payload.budget.used_bytes = outputBytes(payload);
  if (payload.budget.used_bytes > payload.budget.effective_max_bytes
    || Buffer.byteLength(JSON.stringify(payload), 'utf8') !== payload.budget.used_bytes) {
    fail('budget_too_small', 'max_bytes cannot hold required search metadata');
  }
  return payload;
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

function exactMetadataMatch(entity, query) {
  const exact = exactText(query);
  const fields = [entity.id, entity.label, ...(entity.aliases ?? []), ...(entity.tags ?? []), entity.anchor?.heading_path?.join(' ')];
  return exact.length > 0 && fields.some((field) => exactText(field) === exact);
}

function entityScore(entity, query, tokens) {
  if (exactMetadataMatch(entity, query)) return 1000;
  return matchingTokens(entity, tokens).length * 10;
}

function matchingTokens(entity, tokens) {
  // ID prefixes and percent-encoded anchors are storage syntax, not source text.
  const fields = [sourcePath(entity), entity.label, ...(entity.aliases ?? []), ...(entity.tags ?? []), entity.anchor?.heading_path?.join(' ')];
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

function evidenceFor(entity, read, scopes, maxBytes = MAX_EXCERPT_BYTES) {
  const uri = sourcePath(entity);
  if (!uri || !inScope(uri, scopes)) return null;
  const anchor = entity.anchor;
  if (!anchor || !Number.isInteger(anchor.start_byte) || !Number.isInteger(anchor.end_byte)) return null;
  const blob = read(uri);
  const raw = blob.subarray(anchor.start_byte, anchor.end_byte);
  if (normalizedHash(entity.content_hash) !== sha256(raw)) return null;
  const snippet = safeExcerpt(blob, anchor.start_byte, anchor.end_byte, maxBytes);
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

function addEvidenceWithinBudget(payload, item, maximum, onOutputLimit) {
  const fits = (candidate) => {
    payload.evidence_units.push(candidate);
    const okay = outputBytes(payload) <= maximum;
    payload.evidence_units.pop();
    return okay;
  };
  if (fits(item)) {
    payload.evidence_units.push(item);
    return true;
  }
  onOutputLimit();
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
  const summaries = gaps.filter((gap) => gap.reason === 'coverage_gaps_omitted');
  const hidden = Math.max(0, ...summaries.map((gap) => gap.total_matching - gap.returned));
  const sorted = gaps.filter((gap) => gap.reason !== 'coverage_gaps_omitted')
    .sort((a, b) => stableJson(a).localeCompare(stableJson(b)));
  const total = Math.max(sorted.length + hidden, ...summaries.map((gap) => gap.total_matching));
  if (sorted.length <= maximum && total === sorted.length) return sorted;
  return [
    ...sorted.slice(0, maximum),
    { source_id: sourceId, scope: scopes, reason: 'coverage_gaps_omitted', total_matching: total, returned: Math.min(sorted.length, maximum) },
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

function trimToBudget(payload, maximum, directEvidenceToDocument, ownerDocumentForEntity, requiredEvidenceIds) {
  let changed = false;
  const directIds = new Set(directEvidenceToDocument.keys());
  const removeAt = (items, index) => {
    if (index < 0) return false;
    items.splice(index, 1);
    changed = true;
    return true;
  };
  while (outputBytes(payload) > maximum) {
    const referenced = new Set(payload.relations.map((relation) => relation.evidence_unit_id));
    const optionalProvenance = payload.evidence_units.findLastIndex((item) => directIds.has(item.id)
      && !requiredEvidenceIds.has(item.id) && !referenced.has(item.id));
    if (removeAt(payload.evidence_units, optionalProvenance)) {
      payload.budget.omitted_evidence_units += 1;
      payload.budget.omitted_evidence_units += pruneOrphans(payload, directEvidenceToDocument, ownerDocumentForEntity);
      continue;
    }
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
    const directEvidence = payload.evidence_units.filter((item) => requiredEvidenceIds.has(item.id));
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
  return retrieve(options, args, snapshot, 'lookup');
}

/** List ranked document candidates without treating metadata as body evidence. */
export function search(options, args, snapshot) {
  return retrieve(options, args, snapshot, 'search');
}

function retrieve(options, args, snapshot, mode) {
  const allowlist = validateOptions(options);
  const request = mode === 'search' ? validateSearchArgs(args) : validateArgs(args);
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
    if (base.budget.exhausted) {
      const previousGaps = base.coverage_gaps;
      base.coverage_gaps = boundedGaps([...previousGaps, {
        source_id: manifest.source_id, scope: scopes, reason: 'output_limit_reached',
      }], manifest.source_id, scopes);
      // The budget flag already reports exhaustion; its optional explanation
      // must not consume space needed by the selected source evidence.
      if (outputBytes(base) > effectiveMaxBytes) base.coverage_gaps = previousGaps;
    }
    base.budget.used_bytes = outputBytes(base);
    if (base.budget.used_bytes > effectiveMaxBytes) fail('budget_too_small', 'max_bytes cannot hold required result metadata');
    const actual = Buffer.byteLength(JSON.stringify(base), 'utf8');
    if (actual !== base.budget.used_bytes || actual > effectiveMaxBytes) fail('budget_too_small', 'max_bytes cannot hold required result metadata');
    return base;
  };
  if (scopes.length === 0) {
    if (mode === 'search') return documentSearchPage({ base, request, roots: [], byDocument: new Map(), scopes });
    return finalize();
  }

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
  const conditionTerms = request.conditions.map(words);
  const tokens = [...new Set([...words(request.query), ...conditionTerms.flat()])];
  const sectionTerms = new Map();
  const scoreSection = (section, weights) => {
    const body = read(sourcePath(section)).subarray(section.anchor?.start_byte ?? 0, section.anchor?.end_byte ?? 0).toString('utf8').toLowerCase();
    const match = scoreBodyMatch(body, tokens, weights);
    sectionTerms.set(section.id, match.matchedTokens);
    // Long notes can repeat broad terms without answering the specific query.
    const lengthPenalty = 1 + 0.2 * Math.log1p(body.length / 200);
    return { ...match, score: entityScore(section, request.query, tokens) + match.score / lengthPenalty };
  };
  base.matching.query_term_count = tokens.length;
  let maxSectionTermMatches = 0;
  const scored = new Map();
  const sectionScores = new Map();
  const exactSections = new Set();
  for (const doc of documents) {
    const score = entityScore(doc, request.query, tokens);
    if (score > 0) scored.set(doc.id, {
      doc,
      score,
      direct: null,
      metadataMatch: exactMetadataMatch(doc, request.query),
      matchedTokens: new Set(matchingTokens(doc, tokens)),
    });
  }
  for (const section of sections) {
    const docId = documentIdFor(section, documentsByPath);
    const doc = documentsByPath.get(sourcePath(section));
    if (!docId || !doc) continue;
    const score = entityScore(section, request.query, tokens);
    const exact = exactMetadataMatch(section, request.query);
    if (exact) exactSections.add(section.id);
    const useful = isUsefulSection(section);
    sectionScores.set(section.id, useful || section.type === 'RelationAssertion' ? score : 0);
    if (useful) {
      maxSectionTermMatches = Math.max(maxSectionTermMatches, matchingTokens(section, tokens).length);
    }
    const existing = scored.get(docId);
    if (existing) {
      for (const token of matchingTokens(section, tokens)) existing.matchedTokens.add(token);
      existing.metadataMatch ||= exact;
    }
    if (score > 0 && (!existing || existing.score < score)) {
      scored.set(docId, {
        doc,
        score,
        direct: section,
        metadataMatch: exact || existing?.metadataMatch === true,
        matchedTokens: new Set([...(existing?.matchedTokens ?? []), ...matchingTokens(section, tokens)]),
      });
    }
  }
  const hasExactMetadataHit = [...scored.values()].some((entry) => entry.metadataMatch);
  // A single exact title or alias needs no broad scan. Multi-term questions use
  // one pinned Git batch to distinguish specific terms from generic ones.
  const scanBodies = tokens.length > 0 && (!hasExactMetadataHit || tokens.length > 1);
  const localWeights = new Map(tokens.map((token) => [token, 1]));
  if (scanBodies) {
    for (const doc of documents) assertNoSymlink(options.repo, sourcePath(doc));
    // Resolve the pinned tree once instead of resolving revision:path per blob.
    const files = listMarkdown(options.repo, manifest.revision, scopes)
      .filter((file) => documentsByPath.has(file.path));
    if (files.length !== documents.length) fail('source_unavailable', 'cannot resolve every pinned document');
    for (const [uri, blob] of readBlobs(options.repo, files)) memo.set(uri, blob);
    const documentBodies = [...memo.values()].map((blob) => blob.toString('utf8').toLowerCase());
    const documentFrequency = new Map(tokens.map((token) => [token,
      documentBodies.reduce((count, body) => count + Number(body.includes(token)), 0)]));
    const weights = new Map(tokens.map((token) => [token,
      1 + Math.log((documents.length + 1) / ((documentFrequency.get(token) ?? 0) + 1))]));
    for (const [token, weight] of weights) localWeights.set(token, weight);
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
        // Hints expand retrieval, but must not displace an exact query metadata root.
        if ((!entry.metadataMatch || conditionTerms.length === 0)
          && !hasDiscriminativeMatch(entry, discriminative)) scored.delete(id);
      }
    }
  } else if (tokens.length > 0) {
    // Keep exact single-term document ranking cheap, but read matched documents
    // so a shared filename cannot tie every section with the explanatory body.
    const pending = searchableSections.filter((section) => scored.get(documentIdFor(section, documentsByPath))?.metadataMatch);
    const paths = [...new Set(pending.map(sourcePath))];
    for (const [uri, blob] of readPinnedBlobs(options.repo, manifest.revision, paths)) memo.set(uri, blob);
    for (const section of pending) {
      const bodyMatch = scoreSection(section, localWeights);
      sectionScores.set(section.id, bodyMatch.score);
      maxSectionTermMatches = Math.max(maxSectionTermMatches,
        new Set([...matchingTokens(section, tokens), ...bodyMatch.matchedTokens]).size);
    }
  }
  // A document's title or alias can outrank all of its useful body sections.
  // Choose the reading start separately; root provenance is included elsewhere.
  for (const entry of scored.values()) {
    if (entry.direct?.type === 'Section' && !entry.direct.anchor?.heading_path?.length
      && exactText(request.query) !== exactText(entry.direct.id)) {
      entry.provenance = entry.direct;
      entry.direct = null;
    }
  }
  for (const section of sections) {
    if (section.type === 'Section' && !section.anchor?.heading_path?.length
      && exactText(request.query) !== exactText(section.id)) continue;
    const entry = scored.get(documentIdFor(section, documentsByPath));
    if (!entry) continue;
    const score = sectionScores.get(section.id) ?? 0;
    const exactPriority = Number(exactSections.has(section.id)) - Number(exactSections.has(entry.direct?.id));
    if (exactPriority > 0 || (exactPriority === 0 && score > (sectionScores.get(entry.direct?.id) ?? 0))) entry.direct = section;
  }
  base.matching.max_section_term_matches = maxSectionTermMatches;
  base.matching.assessment = maxSectionTermMatches > 0 ? 'lexical_overlap' : 'no_lexical_overlap';
  if (hasExactMetadataHit) base.matching.assessment = 'exact_metadata';
  else if (tokens.length >= 8 && maxSectionTermMatches > 0 && maxSectionTermMatches <= 2) {
    base.matching.assessment = 'weak_lexical_overlap';
  }
  const roots = [...scored.values()].sort((a, b) => Number(b.metadataMatch) - Number(a.metadataMatch)
    || b.score - a.score || a.doc.id.localeCompare(b.doc.id));
  if (mode === 'search') return documentSearchPage({ base, request, roots, byDocument, scopes, tokens });
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
      || relatedDocumentScore(b) - relatedDocumentScore(a)
      // Explicit navigation breaks relevance ties; it does not establish applicability.
      || (LINK_ROLE_PRIORITY[b.link_role] ?? 0) - (LINK_ROLE_PRIORITY[a.link_role] ?? 0)
      || a.id.localeCompare(b.id));
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
  // Reserve the longest status used by a pack with evidence, rather than the
  // longer empty-result status, while fitting direct and graph evidence.
  base.result_status = 'partial';
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
  const provenanceEvidence = [];
  const rootForEvidence = new Map();
  for (const root of roots) {
    if (!includedRootIds.has(root.doc.id)) continue;
    if (root.metadataMatch || root.provenance) {
      const rootSection = byDocument.get(root.doc.id)?.find((section) => section.type === 'Section' && section.anchor?.heading_path?.length === 0);
      if (rootSection) {
        provenanceEvidence.push(rootSection.id);
        rootForEvidence.set(rootSection.id, root.doc.id);
      }
    }
    const section = root.direct ?? preferredSection(byDocument.get(root.doc.id));
    if (section) {
      directEvidence.push(section.id);
      rootForEvidence.set(section.id, root.doc.id);
    }
  }
  const requiredEvidenceIds = new Set(directEvidence);
  const addSourceEvidence = (id) => {
    const item = evidence(id);
    if (!item) {
      appendGap(base.coverage_gaps, { source_id: manifest.source_id, scope: scopes, reason: 'source_unavailable', evidence_unit_id: id });
      return;
    }
    if (!addEvidenceWithinBudget(base, item, effectiveMaxBytes, markOutputLimit)) {
      omitEvidence(id);
      return;
    }
    restoreEvidence(id);
  };
  for (const id of requiredEvidenceIds) addSourceEvidence(id);
  if (roots.length > 0 && base.evidence_units.length === 0) fail('budget_too_small', 'max_bytes cannot hold a direct evidence unit');
  const addSelectedRelation = (relation) => {
    const item = evidence(relation.evidence_unit_id);
    const endpoints = [entitiesById.get(relation.subject), entitiesById.get(relation.object)];
    if (!item || endpoints.some((entity) => !entity)) {
      appendGap(base.coverage_gaps, { source_id: manifest.source_id, scope: scopes, reason: 'source_unavailable', evidence_unit_id: relation.evidence_unit_id });
      base.budget.omitted_relations += 1;
      return;
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
      return;
    }
    restoreEvidence(relation.evidence_unit_id);
  };
  // Reserve one direct link, then spend on complementary sections before more links.
  const directRelation = hasExactMetadataHit ? undefined
    : selectedRelations.find((relation) => requiredEvidenceIds.has(relation.evidence_unit_id));
  if (directRelation) addSelectedRelation(directRelation);
  if (!hasExactMetadataHit || conditionTerms.length > 0) {
    const represented = new Map(tokens.map((token) => [token, 0]));
    const representedConditions = conditionTerms.map(() => 0);
    // These are lexical coverage hints, never proof that a condition is supported.
    const conditionCoverage = (terms) => conditionTerms.map((condition) => {
      const total = condition.reduce((sum, token) => sum + localWeights.get(token), 0);
      return condition.reduce((sum, token) => sum + (terms.has(token) ? localWeights.get(token) : 0), 0) / total;
    });
    const recordTerms = (item) => {
      const text = item.excerpt.toLowerCase();
      for (const token of tokens) if (text.includes(token)) represented.set(token, represented.get(token) + 1);
      const covered = conditionCoverage(new Set(tokens.filter((token) => text.includes(token))));
      for (let index = 0; index < covered.length; index += 1) {
        representedConditions[index] = Math.max(representedConditions[index], covered[index]);
      }
    };
    for (const item of base.evidence_units) recordTerms(item);
    const candidates = [...selected.values()].filter((entity) => entity.type === 'Document')
      .flatMap((doc) => (byDocument.get(doc.id) ?? [])
        .filter((section) => section.anchor.heading_path.length > 0 && !requiredEvidenceIds.has(section.id)
          && sectionTerms.get(section.id)?.size > 0)
        .map((section) => ({ section, doc, item: evidence(section.id) })))
      .filter((candidate) => candidate.item)
      .map((candidate) => ({ ...candidate, terms: [...sectionTerms.get(candidate.section.id)],
        coverage: conditionCoverage(sectionTerms.get(candidate.section.id)) }));
    // ponytail: six complementary sections in the bounded graph; semantic reranking needs a measured benefit.
    for (let added = 0; added < MAX_ROOTS && candidates.length > 0;) {
      const gain = (candidate) => candidate.terms.reduce((total, token) => total + localWeights.get(token) / (1 + represented.get(token)), 0);
      const conditionGain = (candidate) => candidate.coverage.reduce((total, coverage, index) =>
        total + Math.max(0, coverage - representedConditions[index]), 0);
      candidates.sort((a, b) => conditionGain(b) - conditionGain(a) || gain(b) - gain(a)
        || (sectionScores.get(b.section.id) ?? 0) - (sectionScores.get(a.section.id) ?? 0)
        || a.section.id.localeCompare(b.section.id));
      const { section, doc, item: prefix } = candidates.shift();
      if (base.evidence_units.some((unit) => unit.id === prefix.id)) continue;
      const complete = evidenceFor(section, read, scopes, effectiveMaxBytes);
      const prefixMatches = tokens.some((token) => prefix.excerpt.toLowerCase().includes(token));
      const excerptGain = (item) => conditionGain({ coverage: conditionCoverage(new Set(
        tokens.filter((token) => item.excerpt.toLowerCase().includes(token)))) });
      const completesCondition = conditionTerms.length > 0 && complete && !complete.truncated
        && excerptGain(complete) > excerptGain(prefix);
      let item = (!prefixMatches || completesCondition) && complete && !complete.truncated ? complete : prefix;
      const addedDocument = !base.entities.some((entity) => entity.id === doc.id);
      if (addedDocument) base.entities.push(publicEntity(doc));
      base.evidence_units.push(item);
      if (outputBytes(base) > effectiveMaxBytes) {
        base.evidence_units.pop();
        item = prefix;
        base.evidence_units.push(item);
      }
      if (!tokens.some((token) => item.excerpt.toLowerCase().includes(token)) || outputBytes(base) > effectiveMaxBytes) {
        base.evidence_units.pop();
        if (addedDocument) base.entities.pop();
        omitEvidence(section.id);
        markOutputLimit();
        continue;
      }
      requiredEvidenceIds.add(section.id);
      rootForEvidence.set(section.id, doc.id);
      restoreEvidence(section.id);
      recordTerms(item);
      added += 1;
    }
  }
  const completeEvidence = () => {
    for (const item of base.evidence_units) {
      if (!item.truncated || !item.anchor.heading_path.length) continue;
      const complete = evidenceFor(sectionsById.get(item.id), read, scopes, effectiveMaxBytes);
      if (!complete || complete.truncated) continue;
      const excerpt = item.excerpt;
      item.excerpt = complete.excerpt;
      item.truncated = false;
      if (outputBytes(base) > effectiveMaxBytes) {
        item.excerpt = excerpt;
        item.truncated = true;
      }
    }
  };
  if (!hasExactMetadataHit) completeEvidence();
  for (const relation of selectedRelations) if (relation !== directRelation) addSelectedRelation(relation);
  for (const id of new Set(provenanceEvidence)) {
    if (!base.evidence_units.some((item) => item.id === id)) addSourceEvidence(id);
  }
  const survivingDirect = base.evidence_units.filter((item) => requiredEvidenceIds.has(item.id));
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
  if (!trimToBudget(base, effectiveMaxBytes, directEvidenceToDocument, ownerDocumentForEntity, requiredEvidenceIds)) {
    fail('budget_too_small', 'max_bytes cannot hold a direct evidence unit with required metadata');
  }
  if (base.budget.exhausted) {
    base.result_status = base.evidence_units.length > 0 ? 'partial' : 'insufficient_evidence';
    if (!trimToBudget(base, effectiveMaxBytes, directEvidenceToDocument, ownerDocumentForEntity, requiredEvidenceIds)) {
      fail('budget_too_small', 'max_bytes cannot hold a direct evidence unit with required metadata');
    }
  }
  // Finish selected sections when their remaining context fits the response.
  completeEvidence();
  return finalize();
}
