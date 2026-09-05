import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

import { ContextError, DEFAULT_SCOPES, normalizeScopes } from './core.mjs';
import { lookup } from './query.mjs';
import { getRepoState } from './repository.mjs';
import { buildSnapshot, defaultCacheDir, loadSnapshot } from './snapshot.mjs';

export { DEFAULT_SCOPES } from './core.mjs';
export const SERVER_LIMITS = Object.freeze({
  maxArgumentBytes: 8192,
  maxQueryBytes: 4096,
  maxScopeEntries: 20,
  maxScopePathBytes: 512,
  maxDepth: 2,
  maxBytes: 65536,
});

const inputSchema = z.object({
  query: z.string().min(1).max(SERVER_LIMITS.maxQueryBytes),
  scope: z.array(z.string().min(1).max(SERVER_LIMITS.maxScopePathBytes)).max(SERVER_LIMITS.maxScopeEntries).optional(),
  depth: z.union([z.literal(1), z.literal(2)]).optional(),
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
    description: 'Retrieves evidence from this personal knowledge vault. Use scope to limit retrieval to README.md, biz, econ, fit, ontology, or tech. Inspect source evidence and current project materials before applying it. Ontology design and operations documents describe the retrieval system and do not prove current implementation, adoption, or runtime behavior.',
    inputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  }, (args) => {
    try {
      assertArgumentSize(args);
      ensureFreshSnapshot(settings);
      const payload = lookup({
        repo: settings.repo,
        cacheDir: settings.cacheDir,
        allowlist: settings.allowlist,
      }, args);
      return payloadResult(payload);
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
 * the caller opted into the pinned HEAD mode.
 */
export function ensureFreshSnapshot(options) {
  const settings = normalizeSettings(options);
  const state = getRepoState(settings.repo);
  let snapshot;

  try {
    snapshot = loadSnapshot({ repo: settings.repo, cacheDir: settings.cacheDir });
  } catch (error) {
    if (!isMissingSnapshot(error)) throw error;
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
        : 'The worktree is dirty and no clean snapshot is available.',
    );
  }

  const summary = buildSnapshot({
    repo: settings.repo,
    cacheDir: settings.cacheDir,
    scopes: settings.scopes,
    committedOnly: settings.committedOnly,
  });
  const loaded = loadSnapshot({ repo: settings.repo, cacheDir: settings.cacheDir });
  return { state, snapshot: loaded, summary, refreshed: true, dirty: Boolean(state.dirty) };
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

function assertArgumentSize(args) {
  const size = Buffer.byteLength(JSON.stringify(args), 'utf8');
  if (size > SERVER_LIMITS.maxArgumentBytes) {
    throw new ContextError('invalid_arguments', `Tool arguments exceed ${SERVER_LIMITS.maxArgumentBytes} bytes.`);
  }
  if (Buffer.byteLength(args.query, 'utf8') > SERVER_LIMITS.maxQueryBytes) {
    throw new ContextError('query_too_large', `query exceeds ${SERVER_LIMITS.maxQueryBytes} bytes.`);
  }
  for (const scope of args.scope ?? []) {
    if (Buffer.byteLength(scope, 'utf8') > SERVER_LIMITS.maxScopePathBytes) {
      throw new ContextError('invalid_scope', `scope paths exceed ${SERVER_LIMITS.maxScopePathBytes} bytes.`);
    }
  }
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
  return code === 'index_not_built' || code === 'snapshot_not_found' || code === 'not_found' || code === 'ENOENT';
}
