import fs from 'node:fs';
import path from 'node:path';
import { isUtf8 } from 'node:buffer';
import { ContextError, inScope, normalizeScopes, sha256, stableJson } from './core.mjs';
import { getRepoState, readBlob } from './repository.mjs';
import { loadSnapshot } from './snapshot.mjs';

export const READ_LIMITS = Object.freeze({
  maxArgumentBytes: 65536,
  maxEvidenceIdBytes: 65536,
  defaultMaxBytes: 24000,
  serverMaxBytes: 65536,
});

const LIMITATIONS = [
  'freshness_not_checked',
  'semantic_conflict_not_checked',
  'runtime_not_checked',
];
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const bytes = (value) => Buffer.byteLength(stableJson(value), 'utf8');

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
  if (options.cacheDir !== undefined && (typeof options.cacheDir !== 'string' || options.cacheDir.length === 0)) {
    fail('invalid_options', 'cacheDir must be a non-empty string when provided');
  }
  if (!Array.isArray(options.allowlist)) fail('invalid_options', 'allowlist must be an array');
  return normalizeScopes(options.allowlist);
}

function validateArgs(args) {
  assertPlainObject(args, 'arguments');
  const allowed = new Set(['evidence_unit_id', 'source_revision', 'content_hash', 'offset_bytes', 'max_bytes']);
  for (const key of Object.keys(args)) if (!allowed.has(key)) fail('invalid_arguments', `unknown argument: ${key}`);
  if (bytes(args) > READ_LIMITS.maxArgumentBytes) fail('arguments_too_large');
  if (typeof args.evidence_unit_id !== 'string' || Buffer.byteLength(args.evidence_unit_id, 'utf8') === 0) {
    fail('invalid_evidence_unit_id', 'evidence_unit_id is required');
  }
  if (Buffer.byteLength(args.evidence_unit_id, 'utf8') > READ_LIMITS.maxEvidenceIdBytes) fail('evidence_id_too_large');
  if (typeof args.source_revision !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(args.source_revision)) {
    fail('invalid_source_revision');
  }
  if (typeof args.content_hash !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(args.content_hash)) {
    fail('invalid_content_hash');
  }
  if (own(args, 'offset_bytes') && (!Number.isSafeInteger(args.offset_bytes) || args.offset_bytes < 0)) {
    fail('invalid_offset_bytes');
  }
  if (own(args, 'max_bytes') && (!Number.isSafeInteger(args.max_bytes) || args.max_bytes <= 0)) {
    fail('invalid_max_bytes');
  }
  return {
    evidenceUnitId: args.evidence_unit_id,
    sourceRevision: args.source_revision,
    contentHash: args.content_hash,
    offsetBytes: args.offset_bytes ?? 0,
    requestedMaxBytes: args.max_bytes ?? READ_LIMITS.defaultMaxBytes,
  };
}

function assertNoSymlink(repo, relativePath) {
  let cursor = repo;
  for (const part of relativePath.split('/')) {
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

function outputBytes(payload) {
  let previous = -1;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    payload.budget.used_bytes = previous < 0 ? 0 : previous;
    const next = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    if (next === previous) return next;
    previous = next;
  }
  return previous;
}

function indexSync(manifest, current) {
  let status = 'synced';
  if (current.dirty) status = 'unindexed_worktree';
  else if (current.revision !== manifest.revision) status = 'revision_mismatch';
  return [{
    source_id: manifest.source_id,
    status,
    revision: manifest.revision,
    current_revision: current.revision,
    artifacts_verified: true,
    completed: manifest.completed,
  }];
}

function validAnchor(anchor, blob) {
  return anchor && Number.isSafeInteger(anchor.start_byte) && Number.isSafeInteger(anchor.end_byte)
    && anchor.start_byte >= 0 && anchor.end_byte >= anchor.start_byte && anchor.end_byte <= blob.length;
}

function isUtf8Boundary(buffer, offset) {
  return offset === 0 || offset === buffer.length || (buffer[offset] & 0xc0) !== 0x80;
}

function payloadFor(unit, sourceRevision, page, offset, total, request, sync) {
  const nextOffset = offset + Buffer.byteLength(page, 'utf8');
  const complete = nextOffset === total;
  return {
    evidence_unit: {
      id: unit.id,
      source_uri: unit.source_uri,
      source_revision: sourceRevision,
      anchor: unit.anchor,
      content_hash: unit.content_hash,
      excerpt: page,
      truncated: !(offset === 0 && complete),
    },
    pagination: {
      offset_bytes: offset,
      next_offset_bytes: complete ? null : nextOffset,
      total_bytes: total,
      complete,
    },
    index_sync: sync,
    limitations: LIMITATIONS,
    budget: {
      requested_max_bytes: request.requestedMaxBytes,
      server_max_bytes: READ_LIMITS.serverMaxBytes,
      effective_max_bytes: request.effectiveMaxBytes,
      used_bytes: 0,
    },
  };
}

function fits(payload, maximum) {
  const used = outputBytes(payload);
  return used <= maximum && Buffer.byteLength(JSON.stringify(payload), 'utf8') === used;
}

function partialPageEnds(raw, offset, maximum) {
  let end = Math.min(raw.length - 1, offset + maximum);
  while (end > offset && !isUtf8Boundary(raw, end)) end -= 1;
  const text = raw.subarray(offset, end).toString('utf8');
  const ends = [offset];
  let cursor = offset;
  for (const codepoint of text) {
    cursor += Buffer.byteLength(codepoint, 'utf8');
    ends.push(cursor);
  }
  return ends;
}

/**
 * Read one immutable, source-backed evidence unit without rebuilding a snapshot.
 */
export function readEvidence(options, args, snapshot) {
  const allowlist = validateOptions(options);
  const request = validateArgs(args);
  snapshot ??= loadSnapshot({ repo: options.repo, cacheDir: options.cacheDir });
  const { manifest } = snapshot;
  if (request.sourceRevision !== manifest.revision) fail('snapshot_revision_mismatch');
  const indexedPaths = manifest.indexed_paths ? normalizeScopes(manifest.indexed_paths) : [];
  const unit = snapshot.entities.find((entity) => entity.id === request.evidenceUnitId);
  if (!unit || !['Section', 'RelationAssertion'].includes(unit.type)
    || !inScope(unit.source_uri ?? '', allowlist) || !inScope(unit.source_uri ?? '', indexedPaths)) {
    fail('evidence_not_found');
  }
  if (request.contentHash !== unit.content_hash) fail('evidence_mismatch');
  if (unit.source_revision !== manifest.revision) fail('source_integrity_error');
  assertNoSymlink(options.repo, unit.source_uri);
  const blob = readBlob(options.repo, manifest.revision, unit.source_uri);
  if (!validAnchor(unit.anchor, blob)) fail('source_integrity_error');
  const raw = blob.subarray(unit.anchor.start_byte, unit.anchor.end_byte);
  if (!isUtf8(raw) || !isUtf8Boundary(blob, unit.anchor.start_byte) || !isUtf8Boundary(blob, unit.anchor.end_byte)
    || unit.content_hash !== `sha256:${sha256(raw)}`) fail('source_integrity_error');
  if (request.offsetBytes > raw.length || !isUtf8Boundary(raw, request.offsetBytes)) fail('invalid_offset_bytes');

  request.effectiveMaxBytes = Math.min(request.requestedMaxBytes, READ_LIMITS.serverMaxBytes);
  const sync = indexSync(manifest, getRepoState(options.repo));
  const remaining = raw.length - request.offsetBytes;
  if (remaining <= request.effectiveMaxBytes) {
    const full = payloadFor(unit, manifest.revision, raw.subarray(request.offsetBytes).toString('utf8'), request.offsetBytes,
      raw.length, request, sync);
    if (fits(full, request.effectiveMaxBytes)) return full;
  }
  const ends = partialPageEnds(raw, request.offsetBytes, request.effectiveMaxBytes);
  const page = (index) => raw.subarray(request.offsetBytes, ends[index]).toString('utf8');
  const candidate = (index) => payloadFor(unit, manifest.revision, page(index), request.offsetBytes, raw.length, request, sync);
  if (!fits(candidate(0), request.effectiveMaxBytes)) fail('budget_too_small');
  let low = 0;
  let high = ends.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (fits(candidate(middle), request.effectiveMaxBytes)) low = middle;
    else high = middle - 1;
  }
  if (low === 0 && request.offsetBytes < raw.length) fail('budget_too_small');
  const response = candidate(low);
  if (!fits(response, request.effectiveMaxBytes)) fail('budget_too_small');
  return response;
}
