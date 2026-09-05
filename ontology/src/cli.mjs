#!/usr/bin/env node
import { isAbsolute, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { ContextError } from './core.mjs';
import { lookup } from './query.mjs';
import { getRepoState } from './repository.mjs';
import { buildSnapshot, defaultCacheDir, loadSnapshot } from './snapshot.mjs';
import { DEFAULT_SCOPES, ensureFreshSnapshot, serveMcp, toErrorPayload } from './server.mjs';

const DEFAULT_REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export async function main(argv = process.argv.slice(2)) {
  try {
    const parsed = parseArguments(argv);
    if (parsed.help) {
      process.stdout.write(`${usage()}\n`);
      return 0;
    }
    const result = await execute(parsed);
    if (result !== undefined) process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    const { code, message } = toErrorPayload(error);
    process.stderr.write(`${code}: ${message}\n`);
    return 1;
  }
}

export function parseArguments(argv) {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') return { help: true };
  if (!['build', 'lookup', 'serve', 'status'].includes(command)) {
    throw new ContextError('invalid_command', `Unknown command: ${command}`);
  }

  const options = {
    command,
    repo: DEFAULT_REPO,
    cacheDir: undefined,
    scopes: [],
    allowlist: [],
    committedOnly: false,
    query: undefined,
    depth: undefined,
    maxBytes: undefined,
  };
  const seen = new Set();
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    if (flag === '--help' || flag === '-h') {
      if (rest.length !== 1) throw new ContextError('invalid_arguments', '--help cannot be combined with other arguments.');
      return { help: true };
    }
    if (flag === '--committed-only') {
      if (seen.has(flag)) throw new ContextError('invalid_arguments', `${flag} was supplied more than once.`);
      seen.add(flag);
      options.committedOnly = true;
      continue;
    }
    if (!['--repo', '--cache', '--scope', '--allow', '--query', '--depth', '--max-bytes'].includes(flag)) {
      throw new ContextError('invalid_arguments', `Unknown argument: ${flag}`);
    }
    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new ContextError('invalid_arguments', `${flag} requires a value.`);
    }
    index += 1;
    if (flag === '--scope') {
      options.scopes.push(value);
      continue;
    }
    if (flag === '--allow') {
      options.allowlist.push(value);
      continue;
    }
    if (seen.has(flag)) throw new ContextError('invalid_arguments', `${flag} was supplied more than once.`);
    seen.add(flag);
    if (flag === '--repo') options.repo = absolutePath('--repo', value);
    if (flag === '--cache') options.cacheDir = absolutePath('--cache', value);
    if (flag === '--query') options.query = value;
    if (flag === '--depth') options.depth = parseInteger('--depth', value);
    if (flag === '--max-bytes') options.maxBytes = parseInteger('--max-bytes', value);
  }

  if (options.cacheDir && isWithin(options.repo, options.cacheDir)) {
    throw new ContextError('invalid_arguments', '--cache must be outside --repo.');
  }
  if (options.command === 'lookup' && !options.query) {
    throw new ContextError('invalid_arguments', 'lookup requires --query.');
  }
  if (options.depth !== undefined && options.depth !== 1 && options.depth !== 2) {
    throw new ContextError('invalid_arguments', '--depth must be 1 or 2.');
  }
  if (options.maxBytes !== undefined && options.maxBytes <= 0) {
    throw new ContextError('invalid_arguments', '--max-bytes must be a positive integer.');
  }
  if (options.command !== 'lookup' && (options.query !== undefined || options.depth !== undefined || options.maxBytes !== undefined)) {
    throw new ContextError('invalid_arguments', '--query, --depth, and --max-bytes are only valid for lookup.');
  }
  if (options.command === 'status' && (options.scopes.length || options.allowlist.length || options.committedOnly)) {
    throw new ContextError('invalid_arguments', 'status does not accept --scope, --allow, or --committed-only.');
  }
  if (options.command === 'build' && options.allowlist.length) {
    throw new ContextError('invalid_arguments', 'build does not accept --allow.');
  }
  if (options.command === 'serve' && (options.scopes.length || options.query !== undefined || options.depth !== undefined || options.maxBytes !== undefined)) {
    throw new ContextError('invalid_arguments', 'serve accepts --allow and --committed-only only.');
  }
  options.allowlist = options.allowlist.length ? options.allowlist : DEFAULT_SCOPES;
  options.scopes = options.scopes.length ? options.scopes : options.allowlist;
  options.cacheDir ??= defaultCacheDir(options.repo);
  return options;
}

export async function execute(options) {
  if (options.command === 'build') {
    const state = getRepoState(options.repo);
    if (state.dirty && !options.committedOnly) {
      throw new ContextError('unindexed_worktree', 'Refusing to build a snapshot from a dirty worktree. Use --committed-only to index HEAD.');
    }
    return buildSnapshot({
      repo: options.repo,
      cacheDir: options.cacheDir,
      scopes: options.scopes,
      committedOnly: options.committedOnly,
    });
  }
  if (options.command === 'lookup') {
    ensureFreshSnapshot({
      repo: options.repo,
      cacheDir: options.cacheDir,
      scopes: options.scopes,
      allowlist: options.allowlist,
      committedOnly: options.committedOnly,
    });
    const args = { query: options.query, scope: options.scopes };
    if (options.depth !== undefined) args.depth = options.depth;
    if (options.maxBytes !== undefined) args.max_bytes = options.maxBytes;
    return lookup({ repo: options.repo, cacheDir: options.cacheDir, allowlist: options.allowlist }, args);
  }
  if (options.command === 'status') return status(options);
  if (options.command === 'serve') {
    await serveMcp({
      repo: options.repo,
      cacheDir: options.cacheDir,
      allowlist: options.allowlist,
      scopes: options.allowlist,
      committedOnly: options.committedOnly,
    });
    return undefined;
  }
  throw new ContextError('invalid_command', `Unknown command: ${options.command}`);
}

function status(options) {
  const repo = getRepoState(options.repo);
  try {
    const snapshot = loadSnapshot({ repo: options.repo, cacheDir: options.cacheDir });
    return { repo, manifest: snapshot.manifest, fingerprint: snapshot.fingerprint };
  } catch (error) {
    if (isMissingSnapshot(error)) return { repo, manifest: null, fingerprint: null };
    throw error;
  }
}

function absolutePath(flag, value) {
  if (!isAbsolute(value)) throw new ContextError('invalid_arguments', `${flag} must be an absolute path.`);
  return resolve(value);
}

function parseInteger(flag, value) {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) throw new ContextError('invalid_arguments', `${flag} must be a non-negative integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new ContextError('invalid_arguments', `${flag} must be a safe integer.`);
  return parsed;
}

function isWithin(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

function isMissingSnapshot(error) {
  return ['index_not_built', 'snapshot_not_found', 'not_found', 'ENOENT'].includes(error?.code);
}

export function usage() {
  return [
    'Usage: context-ontology <build|lookup|serve|status> [options]',
    '  --repo <absolute-path>       Vault repository, defaults to this repository',
    '  --cache <absolute-path>      Cache outside the repository',
    `  --scope <path>               Repeatable build or lookup scope, defaults to ${DEFAULT_SCOPES.join(', ')}`,
    `  --allow <path>               Repeatable lookup or server allowlist, defaults to ${DEFAULT_SCOPES.join(', ')}`,
    '  --committed-only              Build or serve the current HEAD when worktree is dirty',
    '  lookup requires --query <text>; accepts --depth <1|2> and --max-bytes <integer>',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const exitCode = await main();
  process.exitCode = exitCode;
}
