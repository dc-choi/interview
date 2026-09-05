import { execFileSync, spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { isUtf8 } from 'node:buffer';
import { ContextError, inScope } from './core.mjs';

const gitEnv = { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1', LC_ALL: 'C' };

export function git(repo, args, input) {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      env: gitEnv, input, maxBuffer: 128 * 1024 * 1024, timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    throw new ContextError('source_unavailable', 'cannot read the requested Git source');
  }
}

export function resolveRepo(repo) {
  return realpathSync(git(repo, ['rev-parse', '--show-toplevel']).toString().trim());
}

export function getRepoState(repo) {
  return {
    revision: git(repo, ['rev-parse', '--verify', 'HEAD^{commit}']).toString().trim(),
    dirty: git(repo, ['status', '--porcelain=v1', '-z', '--untracked-files=normal']).length > 0,
  };
}

function checkRevision(revision) {
  if (!/^[a-f0-9]{40,64}$/.test(revision)) throw new ContextError('invalid_revision');
}

export function listMarkdown(repo, revision, scopes) {
  checkRevision(revision);
  const listing = git(repo, ['ls-tree', '-r', '-z', '--full-tree', revision]);
  if (!isUtf8(listing)) throw new ContextError('invalid_source_path_encoding', 'Git paths must be UTF-8');
  return listing.toString().split('\0')
    .filter(Boolean).map((line) => {
      const tab = line.indexOf('\t');
      const [mode, type, oid] = line.slice(0, tab).split(' ');
      return { mode, type, oid, path: line.slice(tab + 1) };
    }).filter((item) => item.type === 'blob' && /^100(644|755)$/.test(item.mode)
      && item.path.endsWith('.md') && !/(^|\/)(AGENTS|CLAUDE)\.md$/.test(item.path)
      && !/[\x00-\x1f\x7f]/.test(item.path) && inScope(item.path, scopes))
    .map((item) => {
      if (item.path.includes('\\')) throw new ContextError('invalid_source_path', 'Git Markdown paths cannot contain backslashes');
      return item;
    })
    .sort((a, b) => a.path < b.path ? -1 : Number(a.path > b.path));
}

export function readBlob(repo, revision, path) {
  checkRevision(revision);
  if (typeof path !== 'string' || path.startsWith('/') || path.split('/').includes('..')
    || /[\\\x00-\x1f\x7f]/.test(path)) throw new ContextError('invalid_source_path');
  return git(repo, ['cat-file', 'blob', `${revision}:${path}`]);
}

export function readBlobs(repo, files) {
  if (files.length === 0) return new Map();
  const result = spawnSync('git', ['-C', repo, 'cat-file', '--batch'], {
    env: gitEnv, input: files.map((file) => file.oid).join('\n') + '\n',
    maxBuffer: 128 * 1024 * 1024, timeout: 60000,
  });
  if (result.status !== 0 || result.error) throw new ContextError('source_unavailable');
  const blobs = new Map();
  let offset = 0;
  for (const file of files) {
    const end = result.stdout.indexOf(10, offset);
    const [oid, type, size] = result.stdout.subarray(offset, end).toString().split(' ');
    const length = Number(size);
    if (oid !== file.oid || type !== 'blob' || !Number.isSafeInteger(length) || length < 0
      || end + 1 + length >= result.stdout.length) throw new ContextError('invalid_git_blob');
    blobs.set(file.path, result.stdout.subarray(end + 1, end + 1 + length));
    offset = end + 1 + length + 1;
  }
  return blobs;
}

export function sourceUpdatedTimes(repo, revision, files) {
  checkRevision(revision);
  const wanted = new Set(files.map((file) => file.path));
  const times = new Map();
  const parts = git(repo, ['log', '--topo-order', '--format=%x00COMMIT:%cI%x00',
    '--name-only', '-z', '--no-renames', revision, '--']).toString().split('\0');
  let timestamp;
  for (let part of parts) {
    part = part.replace(/^\n+/, '');
    if (part.startsWith('COMMIT:')) {
      timestamp = part.slice(7);
    } else if (wanted.has(part) && !times.has(part)) {
      times.set(part, timestamp);
    }
  }
  const fallback = git(repo, ['show', '-s', '--format=%cI', revision]).toString().trim();
  for (const file of files) if (!times.has(file.path)) times.set(file.path, fallback);
  return times;
}
