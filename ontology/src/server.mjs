import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

import { CONCEPT_LIMITS, conceptQuery } from './concept.mjs';
import { ContextError, DEFAULT_SCOPES, normalizeScopes } from './core.mjs';
import { lookup, search } from './query.mjs';
import { readEvidence, READ_LIMITS } from './read-evidence.mjs';
import { outlineEvidence, OUTLINE_LIMITS } from './outline.mjs';
import { getRepoStateWithRoot } from './repository.mjs';
import { buildSnapshot, defaultCacheDir, loadSnapshot } from './snapshot.mjs';

export { DEFAULT_SCOPES } from './core.mjs';
export const SERVER_LIMITS = Object.freeze({
  maxArgumentBytes: 8192,
  maxQueryBytes: 4096,
  maxScopeEntries: 20,
  maxScopePathBytes: 512,
});

const inputSchema = z.object({
  query: z.string().min(1).max(SERVER_LIMITS.maxQueryBytes),
  conditions: z.array(z.string().min(1).max(1024)).min(1).max(3).optional(),
  scope: z.array(z.string().min(1).max(SERVER_LIMITS.maxScopePathBytes)).max(SERVER_LIMITS.maxScopeEntries).optional(),
  depth: z.union([z.literal(1), z.literal(2)]).optional(),
  max_bytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
}).strict();

const searchInputSchema = z.object({
  query: z.string().min(1).max(SERVER_LIMITS.maxQueryBytes),
  scope: z.array(z.string().min(1).max(SERVER_LIMITS.maxScopePathBytes)).max(SERVER_LIMITS.maxScopeEntries).optional(),
  max_bytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  // The query layer validates opaque cursor syntax and emits invalid_cursor.
  // Keeping this as a string lets MCP callers receive that stable error code.
  cursor: z.string().optional(),
}).strict();

const readInputSchema = z.object({
  evidence_unit_id: z.string().min(1).max(READ_LIMITS.maxEvidenceIdBytes),
  source_revision: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/),
  content_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  offset_bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  max_bytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
}).strict();

const conceptNames = z.array(z.string().min(1).max(64)).min(1).max(CONCEPT_LIMITS.maxFilters).optional();
const conceptInputSchema = z.object({
  concept: z.string().min(1).max(CONCEPT_LIMITS.maxConceptBytes),
  predicates: conceptNames,
  types: conceptNames,
  depth: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  include_inferred: z.boolean().optional(),
  max_bytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
}).strict();

const outlineInputSchema = z.object({
  document_id: z.string().min(1).max(OUTLINE_LIMITS.maxDocumentIdBytes),
  source_revision: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/),
  offset_sections: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  max_bytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
}).strict();

/**
 * Creates the read-only MCP server. Repository and cache locations are supplied
 * by the host process, never by tool arguments.
 */
export function createContextServer(options) {
  const settings = normalizeSettings(options);
  const server = new McpServer({ name: 'interview-context-ontology', version: '0.1.0' });

  server.registerTool('context_lookup', {
    title: 'Lookup personal knowledge',
    description: 'Retrieves evidence from this personal knowledge vault. Use scope to limit retrieval to README.md, biz, econ, fit, ontology, or tech. Optional relation link_role describes source navigation: index_member, parent_index, or related_document; it does not establish applicability. A weak_lexical_overlap matching assessment requires checking whether the returned material addresses the question. Use context_outline to find other sections of a relevant Document and context_read to read their full evidence. If needed documents are not returned, use context_search. Inspect current project materials before applying knowledge. Ontology documents do not prove current implementation, adoption, or runtime behavior. For a multi-condition question, keep the original query and optionally pass up to three conditions as lexical selection hints with max_bytes 24000, then pursue only unresolved conditions. Conditions and result_status do not establish that the evidence supports an answer. The host flow has a total cap of 8 calls and 64000 serialized structuredContent bytes; semantic condition judgments belong to the host. When the vault declares typed concepts, concepts lists up to 8 hints (id, type, label) to pass to context_concept, which follows their typed relations. A hint with evidence_unit_index is supported by that returned evidence unit, as its own evidence Section or the evidence of a relation assertion linking it to another concept; these come first, and up to 5 of them take at most a twentieth of the effective byte budget by cutting excerpt text, longest truncated excerpts first, without dropping units. Other hints, concepts declared in or supported by a Section of the top-ranked matching Documents, only use space the evidence leaves. matching.expanded_terms appears only when concept-label query expansion is enabled; it ships disabled.',
    inputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  }, (args) => {
    try {
      assertArgumentSize(args);
      const { snapshot, state } = ensureFreshSnapshot(settings);
      const payload = lookup({
        repo: settings.repo,
        cacheDir: settings.cacheDir,
        allowlist: settings.allowlist,
      }, args, snapshot, state);
      return payloadResult(payload);
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool('context_search', {
    title: 'Search personal knowledge documents',
    description: 'Searches source-backed Documents in this personal knowledge vault without returning source text. Use scope to limit retrieval to README.md, biz, econ, fit, ontology, or tech. When you find a relevant Document, use context_outline and context_read to inspect its evidence. Use pagination.next_cursor for limited additional exploration when needed. A Document match only establishes lexical overlap, so verify that its source addresses the question before applying it. In the multi-condition host flow, keep the initial scope and use at most two additional lookup or search calls for unresolved conditions.',
    inputSchema: searchInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  }, (args) => {
    try {
      assertSearchArgumentSize(args);
      const { snapshot, state } = ensureFreshSnapshot(settings);
      const payload = search({
        repo: settings.repo,
        cacheDir: settings.cacheDir,
        allowlist: settings.allowlist,
      }, args, snapshot, state);
      return payloadResult(payload);
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool('context_concept', {
    title: 'Query typed concepts',
    description: 'Resolves one typed concept declared in this vault (Topic, Category, Problem, Approach, Condition, or Tradeoff) by concept id, concept:<slug>, slug, label, or alias, and returns its source-confirmed typed relations, definition evidence, and the Documents tagged with, mentioning, or categorized under it. With include_inferred (the default) documents also lists Documents of its narrower concepts within depth, flagged inferred true with that concept_id. ambiguous_concept returns candidates to retry with an exact id; concept_not_found means no visible concept has that exact name; its candidates are suggestions, never resolved, each with match: name (a slug, label or alias containing the term or contained in it), name_tokens (a name sharing enough of its words), then evidence_heading or evidence_text (a supporting Section whose heading path or text holds the term or enough of its words). Check a candidate label and aliases before retrying with its exact id; an empty list means use context_lookup or context_search. predicates filters by predicate or inverse label (addressed_by, required_by, tradeoff_of, narrower) and types filters relation peers by class, including subclasses. Relations with inferred true are computed at query time from schema rules (symmetric, inverse label, transitive broader closure up to depth) and are not stated in the source; derived_from lists the asserted edge ids they come from. Pass an evidence item evidence_unit_id and content_hash with the index_sync revision to context_read, and a Document id to context_outline. A typed relation records what a source states; it does not establish that an approach applies to the current project.',
    inputSchema: conceptInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, (args) => {
    try {
      assertArgumentSize(args, CONCEPT_LIMITS.maxArgumentBytes);
      const { snapshot, state } = ensureFreshSnapshot(settings);
      return payloadResult(conceptQuery({
        repo: settings.repo,
        cacheDir: settings.cacheDir,
        allowlist: settings.allowlist,
      }, args, snapshot, state));
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool('context_read', {
    title: 'Read complete source evidence',
    description: 'Reads a pinned evidence unit beyond the excerpt returned by context_lookup. Copy its id as evidence_unit_id, source_revision, and content_hash. Continue with pagination.next_offset_bytes until pagination.complete is true. Re-run context_lookup if the source revision or evidence hash no longer matches. Reading source text does not verify its current applicability. In the multi-condition host flow, count every page within four read calls and the remaining total byte budget.',
    inputSchema: readInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, (args) => {
    try {
      assertArgumentSize(args, READ_LIMITS.maxArgumentBytes);
      const { snapshot, state } = ensureFreshSnapshot(settings);
      return payloadResult(readEvidence({
        repo: settings.repo,
        cacheDir: settings.cacheDir,
        allowlist: settings.allowlist,
      }, args, snapshot, state));
    } catch (error) {
      return errorResult(error);
    }
  });

  server.registerTool('context_outline', {
    title: 'List pinned document sections',
    description: 'Lists every source-backed Section of a retrieved Document, including headings missed by lookup. Copy a Document id and the lookup index_sync revision. Continue with pagination.next_offset_sections until complete, then pass a relevant section id, source_revision, and content_hash to context_read. An outline is source navigation, not evidence that its contents answer the question. In the multi-condition host flow, count every page within two outline calls and the remaining total byte budget.',
    inputSchema: outlineInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, (args) => {
    try {
      assertArgumentSize(args, OUTLINE_LIMITS.maxArgumentBytes);
      const { snapshot, state } = ensureFreshSnapshot(settings);
      return payloadResult(outlineEvidence({
        repo: settings.repo,
        cacheDir: settings.cacheDir,
        allowlist: settings.allowlist,
      }, args, snapshot, state));
    } catch (error) {
      return errorResult(error);
    }
  });

  return server;
}

/** Connects a configured MCP server to stdio after its initial freshness check. */
export async function serveMcp(options) {
  const settings = normalizeSettings(options);
  ensureFreshSnapshot(settings);
  const server = createContextServer(settings);
  await server.connect(new StdioServerTransport());
  return server;
}

/**
 * Uses an active verified snapshot when it matches HEAD. A dirty worktree may
 * continue to serve an existing clean snapshot, but cannot create one unless
 * the caller opted into the pinned HEAD mode. The returned state is this
 * request's repository check, for the query to report instead of checking again.
 */
export function ensureFreshSnapshot(options) {
  const settings = normalizeSettings(options);
  const { root, ...state } = getRepoStateWithRoot(settings.repo);
  let snapshot;
  let missing;

  try {
    snapshot = loadSnapshot({ repo: settings.repo, cacheDir: settings.cacheDir }, root);
  } catch (error) {
    if (!isMissingSnapshot(error)) throw error;
    missing = error.code;
  }

  if (snapshot && ((sameRevision(snapshot.manifest, state.revision) && sameScopes(snapshot.manifest, settings.scopes))
    || (state.dirty && !settings.committedOnly))) {
    return { state, snapshot, refreshed: false, dirty: Boolean(state.dirty) };
  }

  if (state.dirty && !settings.committedOnly) {
    throw new ContextError(
      'unindexed_worktree',
      snapshot
        ? 'The worktree is dirty, so the existing clean snapshot remains active.'
        : missing === 'snapshot_incompatible'
          ? 'The worktree is dirty and the active snapshot was built by another schema or extractor version. Use --committed-only to rebuild from HEAD.'
          : missing === 'snapshot_not_found'
            ? 'The worktree is dirty and the active snapshot is missing. Retry, or use --committed-only to rebuild from HEAD.'
            : 'The worktree is dirty and no clean snapshot is available.',
    );
  }

  const { snapshot: loaded, ...summary } = buildSnapshot({
    repo: settings.repo,
    cacheDir: settings.cacheDir,
    scopes: settings.scopes,
    committedOnly: settings.committedOnly,
  });
  // A rebuild can take seconds, so the query checks the repository again, as before.
  return { snapshot: loaded, summary, refreshed: true, dirty: Boolean(state.dirty) };
}

export function payloadResult(payload) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}

export function errorResult(error) {
  const payload = { error: toErrorPayload(error) };
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
    isError: true,
  };
}

export function toErrorPayload(error) {
  if (error instanceof ContextError || (error && typeof error.code === 'string')) {
    return { code: error.code, message: error.message };
  }
  return { code: 'internal_error', message: error instanceof Error ? error.message : String(error) };
}

function normalizeSettings(options = {}) {
  if (!options.repo) throw new ContextError('invalid_config', 'repo is required.');
  return {
    repo: options.repo,
    cacheDir: options.cacheDir ?? defaultCacheDir(options.repo),
    scopes: options.scopes?.length ? options.scopes : DEFAULT_SCOPES,
    allowlist: options.allowlist?.length ? options.allowlist : DEFAULT_SCOPES,
    committedOnly: Boolean(options.committedOnly),
  };
}

function assertArgumentSize(args, maximum = SERVER_LIMITS.maxArgumentBytes) {
  const size = Buffer.byteLength(JSON.stringify(args), 'utf8');
  if (size > maximum) {
    throw new ContextError('invalid_arguments', `Tool arguments exceed ${maximum} bytes.`);
  }
  if (args.query !== undefined && Buffer.byteLength(args.query, 'utf8') > SERVER_LIMITS.maxQueryBytes) {
    throw new ContextError('query_too_large', `query exceeds ${SERVER_LIMITS.maxQueryBytes} bytes.`);
  }
  for (const scope of args.scope ?? []) {
    if (Buffer.byteLength(scope, 'utf8') > SERVER_LIMITS.maxScopePathBytes) {
      throw new ContextError('invalid_scope', `scope paths exceed ${SERVER_LIMITS.maxScopePathBytes} bytes.`);
    }
  }
}

function assertSearchArgumentSize(args) {
  const { cursor: _cursor, ...request } = args;
  assertArgumentSize(request);
}

function sameRevision(manifest, revision) {
  return typeof manifest?.revision === 'string' && manifest.revision === revision;
}

function sameScopes(manifest, scopes) {
  const indexed = manifest?.indexed_paths;
  if (!Array.isArray(indexed)) return false;
  const left = normalizeScopes(indexed);
  const right = normalizeScopes(scopes);
  return left.length === right.length && left.every((scope, index) => scope === right[index]);
}

function isMissingSnapshot(error) {
  const code = error?.code;
  return code === 'index_not_built' || code === 'snapshot_incompatible' || code === 'snapshot_not_found';
}
