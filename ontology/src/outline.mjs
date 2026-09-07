import fs from 'node:fs';
import path from 'node:path';
import { isUtf8 } from 'node:buffer';
import { ContextError, inScope, normalizeScopes, sha256, stableJson } from './core.mjs';
import { getRepoState, readBlob } from './repository.mjs';
import { loadSnapshot } from './snapshot.mjs';

export const OUTLINE_LIMITS = Object.freeze({
  maxArgumentBytes: 65536,
  maxDocumentIdBytes: 65536,
  defaultMaxBytes: 24000,
  serverMaxBytes: 65536,
});
const LIMITATIONS = ['freshness_not_checked', 'semantic_conflict_not_checked', 'runtime_not_checked'];
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const fail = (code, message) => { throw new ContextError(code, message); };

function validateOptions(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) fail('invalid_options');
  if (typeof options.repo !== 'string' || !options.repo || !Array.isArray(options.allowlist)) fail('invalid_options');
  if (options.cacheDir !== undefined && (typeof options.cacheDir !== 'string' || !options.cacheDir)) fail('invalid_options');
  return normalizeScopes(options.allowlist);
}

function validateArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) fail('invalid_arguments');
  const allowed = new Set(['document_id', 'source_revision', 'offset_sections', 'max_bytes']);
  for (const key of Object.keys(args)) if (!allowed.has(key)) fail('invalid_arguments');
  if (Buffer.byteLength(stableJson(args), 'utf8') > OUTLINE_LIMITS.maxArgumentBytes) fail('arguments_too_large');
  if (typeof args.document_id !== 'string' || Buffer.byteLength(args.document_id, 'utf8') === 0) fail('invalid_document_id');
  if (Buffer.byteLength(args.document_id, 'utf8') > OUTLINE_LIMITS.maxDocumentIdBytes) fail('document_id_too_large');
  if (typeof args.source_revision !== 'string' || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(args.source_revision)) fail('invalid_source_revision');
  if (own(args, 'offset_sections') && (!Number.isSafeInteger(args.offset_sections) || args.offset_sections < 0)) fail('invalid_offset_sections');
  if (own(args, 'max_bytes') && (!Number.isSafeInteger(args.max_bytes) || args.max_bytes <= 0)) fail('invalid_max_bytes');
  return { documentId: args.document_id, sourceRevision: args.source_revision, offset: args.offset_sections ?? 0,
    requestedMaxBytes: args.max_bytes ?? OUTLINE_LIMITS.defaultMaxBytes };
}

function assertNoSymlink(repo, source) {
  let cursor = repo;
  for (const part of source.split('/')) {
    cursor = path.join(cursor, part);
    try {
      if (fs.lstatSync(cursor).isSymbolicLink()) fail('symlink_path');
    } catch (error) {
      if (error instanceof ContextError) throw error;
      if (error?.code !== 'ENOENT') throw error;
      return;
    }
  }
}

function indexSync(manifest, current) {
  let status = 'synced';
  if (current.dirty) status = 'unindexed_worktree';
  else if (current.revision !== manifest.revision) status = 'revision_mismatch';
  return [{ source_id: manifest.source_id, status, revision: manifest.revision, current_revision: current.revision,
    artifacts_verified: true, completed: manifest.completed }];
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

function receipt(section) {
  return { id: section.id, source_uri: section.source_uri, source_revision: section.source_revision,
    anchor: section.anchor, content_hash: section.content_hash };
}

function validSection(section, blob, revision, source) {
  const anchor = section.anchor;
  if (!anchor || !Number.isSafeInteger(anchor.start_byte) || !Number.isSafeInteger(anchor.end_byte)) return false;
  const boundary = (offset) => offset === 0 || offset === blob.length || (blob[offset] & 0xc0) !== 0x80;
  return section.type === 'Section' && section.source_uri === source && section.source_revision === revision
    && anchor.start_byte >= 0 && anchor.end_byte >= anchor.start_byte && anchor.end_byte <= blob.length
    && boundary(anchor.start_byte) && boundary(anchor.end_byte)
    && section.content_hash === `sha256:${sha256(blob.subarray(anchor.start_byte, anchor.end_byte))}`;
}

function payload(document, sections, offset, total, request, sync) {
  const complete = offset + sections.length === total;
  return {
    document: { id: document.id, source_uri: document.source_uri, source_revision: document.source_revision, content_hash: document.content_hash },
    sections: sections.map(receipt),
    pagination: { offset_sections: offset, next_offset_sections: complete ? null : offset + sections.length, total_sections: total, complete },
    index_sync: sync,
    limitations: LIMITATIONS,
    budget: { requested_max_bytes: request.requestedMaxBytes, server_max_bytes: OUTLINE_LIMITS.serverMaxBytes,
      effective_max_bytes: request.effectiveMaxBytes, used_bytes: 0 },
  };
}

/** Lists source-backed section receipts for one immutable document without reading excerpts. */
export function outlineEvidence(options, args, snapshot) {
  const allowlist = validateOptions(options);
  const request = validateArgs(args);
  snapshot ??= loadSnapshot({ repo: options.repo, cacheDir: options.cacheDir });
  const { manifest } = snapshot;
  if (request.sourceRevision !== manifest.revision) fail('snapshot_revision_mismatch');
  const indexed = manifest.indexed_paths ? normalizeScopes(manifest.indexed_paths) : [];
  const document = snapshot.entities.find((entity) => entity.id === request.documentId);
  if (!document || document.type !== 'Document' || !inScope(document.source_uri ?? '', allowlist) || !inScope(document.source_uri ?? '', indexed)) {
    fail('document_not_found');
  }
  if (document.source_revision !== manifest.revision) fail('source_integrity_error');
  assertNoSymlink(options.repo, document.source_uri);
  const blob = readBlob(options.repo, manifest.revision, document.source_uri);
  if (!isUtf8(blob) || document.content_hash !== `sha256:${sha256(blob)}`) fail('source_integrity_error');
  const sections = snapshot.entities.filter((entity) => entity.type === 'Section' && entity.source_uri === document.source_uri);
  if (!sections.every((section) => validSection(section, blob, manifest.revision, document.source_uri))) fail('source_integrity_error');
  sections.sort((a, b) => a.anchor.start_byte - b.anchor.start_byte || a.id.localeCompare(b.id));
  if (request.offset > sections.length) fail('invalid_offset_sections');
  request.effectiveMaxBytes = Math.min(request.requestedMaxBytes, OUTLINE_LIMITS.serverMaxBytes);
  const sync = indexSync(manifest, getRepoState(options.repo));
  const fit = (items) => {
    const candidate = payload(document, items, request.offset, sections.length, request, sync);
    const used = outputBytes(candidate);
    return used <= request.effectiveMaxBytes && Buffer.byteLength(JSON.stringify(candidate), 'utf8') === used ? candidate : null;
  };
  if (request.offset === sections.length) {
    const terminal = fit([]);
    if (!terminal) fail('budget_too_small');
    return terminal;
  }
  const selected = [];
  let result = null;
  // A receipt's hash alone exceeds the final cursor's maximum size reduction.
  // Stop at the first overflow instead of serializing an unbounded whole outline.
  for (let index = request.offset; index < sections.length; index += 1) {
    const next = fit([...selected, sections[index]]);
    if (!next) break;
    selected.push(sections[index]);
    result = next;
  }
  if (!result) fail('budget_too_small');
  return result;
}
