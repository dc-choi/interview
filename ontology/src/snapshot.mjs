import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join, posix, relative, resolve, sep } from 'node:path';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync, appendFileSync } from 'node:fs';
import { ASSERTION_PREDICATES, DEFAULT_SCOPES, STRUCTURAL_PREDICATES, ContextError, normalizeScopes, sha256, stableJson } from './core.mjs';
import { getRepoState, git, listMarkdown, readBlobs, resolveRepo, sourceUpdatedTimes } from './repository.mjs';
import { extractMarkdown, normalizeHeading } from './markdown.mjs';

const SCHEMA_VERSION = '1';
const EXTRACTOR_VERSION = '11';
const ARTIFACTS = ['schema.json', 'entities.jsonl', 'relations.jsonl'];
const CACHE_MARKER = '.context-ontology-cache';
const CACHE_MARKER_CONTENT = 'interview-context-ontology-v1\n';
const LOCK_WAIT_MS = 10 * 60 * 1000;
const PREDICATES = [...STRUCTURAL_PREDICATES, ...ASSERTION_PREDICATES];
const key = (text) => text.normalize('NFC').toLowerCase();
const jsonFile = (value) => `${stableJson(value)}\n`;

function configuredRepoId() {
  const config = JSON.parse(readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
  if (!config || typeof config !== 'object' || Array.isArray(config)
    || Object.keys(config).length !== 1 || typeof config.repository_id !== 'string'
    || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(config.repository_id)) {
    throw new ContextError('invalid_config', 'config.json must define a stable repository_id');
  }
  return config.repository_id;
}

export function defaultCacheDir(repo) {
  return join(homedir(), '.cache', 'context-ontology', sha256(resolveRepo(repo)).slice(0, 16));
}

function cacheLocation(repo, cacheDir) {
  const path = resolve(cacheDir ?? defaultCacheDir(repo));
  let parent = path;
  const missing = [];
  while (!existsSync(parent)) {
    missing.unshift(basename(parent));
    parent = dirname(parent);
  }
  const resolved = join(realpathSync(parent), ...missing);
  const fromRepo = relative(repo, resolved);
  const toRepo = relative(resolved, repo);
  const contained = (path) => !path || (!path.startsWith(`..${sep}`) && path !== '..' && !path.startsWith(sep));
  if (contained(fromRepo) || contained(toRepo) || resolved === realpathSync(homedir())) {
    throw new ContextError('invalid_cache_path', 'cache must be a dedicated directory outside the source repository and its ancestors');
  }
  return resolved;
}

function add(map, name, record) {
  const id = key(name);
  const entries = map.get(id) ?? [];
  if (!entries.some((entry) => entry.id === record.id)) entries.push(record);
  map.set(id, entries);
}

function linkResolver(documents, units) {
  const paths = new Map();
  const names = new Map();
  const anchors = new Map();
  for (const doc of documents) {
    add(paths, doc.source_uri, doc);
    add(paths, doc.source_uri.replace(/\.md$/i, ''), doc);
    add(names, basename(doc.source_uri, '.md'), doc);
  }
  for (const unit of units) {
    if (unit.type !== 'Section' || unit.anchor.heading_path.length === 0) continue;
    const map = anchors.get(unit.source_uri) ?? new Map();
    add(map, unit.anchor.heading_path.at(-1), unit);
    anchors.set(unit.source_uri, map);
  }
  const resolveTarget = (decoded, source) => {
    const hash = decoded.indexOf('#');
    const file = hash < 0 ? decoded : decoded.slice(0, hash);
    const heading = hash < 0 ? '' : decoded.slice(hash + 1);
    if (file.startsWith('/') || /[\\\x00-\x1f\x7f]/.test(file)) return { reason: 'invalid_link_path' };
    let candidates;
    if (!file) candidates = paths.get(key(source));
    else {
      candidates = paths.get(key(file));
      if (!candidates && file.includes('/')) {
        const location = posix.normalize(posix.join(posix.dirname(source), file));
        if (location === '..' || location.startsWith('../')) return { reason: 'invalid_link_path' };
        candidates = paths.get(key(location)) ?? paths.get(key(`${location}.md`));
      }
      if (!candidates && !file.includes('/')) candidates = names.get(key(file.replace(/\.md$/i, '')));
    }
    if (!candidates?.length) return { reason: 'unresolved_link' };
    if (candidates.length !== 1) return { reason: 'ambiguous_link' };
    if (!heading) return { entity: candidates[0] };
    if (heading.startsWith('^')) return { reason: 'unsupported_block_anchor' };
    const matches = anchors.get(candidates[0].source_uri)?.get(key(normalizeHeading(heading)));
    if (!matches?.length) return { reason: 'unresolved_anchor' };
    if (matches.length !== 1) return { reason: 'ambiguous_anchor' };
    return { entity: matches[0] };
  };
  return (target, source) => {
    const literal = resolveTarget(target, source);
    if (literal.entity || !target.includes('%') || literal.reason.startsWith('ambiguous')) return literal;
    try { return resolveTarget(decodeURIComponent(target), source); }
    catch { return literal; }
  };
}

function relation(subject, predicate, object, evidence, occurrence, linkRole) {
  return {
    id: `edge:sha256:${sha256(stableJson([subject, predicate, object, evidence, occurrence]))}`,
    subject, predicate, object, evidence_unit_id: evidence, assertion_occurrence: occurrence,
    ...(linkRole ? { link_role: linkRole } : {}),
    extraction_method: 'parser', extraction_version: EXTRACTOR_VERSION,
    verification: 'source_confirmed', freshness: 'not_checked', conflict: 'not_checked',
  };
}

function graph(records) {
  const documents = records.map((record) => record.document);
  const units = records.flatMap((record) => record.units);
  const entities = [...documents, ...units].sort((a, b) => a.id < b.id ? -1 : Number(a.id > b.id));
  const ids = new Set(entities.map((entity) => entity.id));
  if (ids.size !== entities.length) throw new ContextError('duplicate_entity_id');
  const resolveLink = linkResolver(documents, units);
  const relations = [];
  const gaps = [];
  for (const record of records) {
    const source = record.document.source_uri;
    gaps.push(...record.coverage_gaps.map((gap) => ({ source_uri: source, reason: gap.type, ...gap })));
    for (const unit of record.units) {
      relations.push(relation(record.document.id, 'contains', unit.id, unit.id, 1));
    }
    for (const link of record.links) {
      const match = resolveLink(link.target, source);
      if (match.entity) {
        relations.push(relation(record.document.id, 'links_to', match.entity.id,
          link.evidence_unit_id, link.assertion_occurrence,
          match.entity.type === 'Section' && match.entity.source_uri === source ? undefined : link.link_role));
      } else {
        gaps.push({ source_uri: source, reason: match.reason, unresolved_target: link.target,
          evidence_unit_id: link.evidence_unit_id });
      }
    }
    for (const assertion of record.assertions) {
      const subject = assertion.subject ?? record.document.id;
      if (!ASSERTION_PREDICATES.includes(assertion.predicate) || !ids.has(subject) || !ids.has(assertion.target)) {
        gaps.push({ source_uri: source, reason: 'unresolved_relation',
          evidence_unit_id: assertion.evidence_unit_id });
        continue;
      }
      relations.push(relation(subject, assertion.predicate, assertion.target,
        assertion.evidence_unit_id, assertion.assertion_occurrence));
    }
  }
  relations.sort((a, b) => a.id < b.id ? -1 : Number(a.id > b.id));
  gaps.sort((a, b) => stableJson(a) < stableJson(b) ? -1 : Number(stableJson(a) > stableJson(b)));
  return { entities, relations, gaps };
}

function readRegular(path) {
  const info = lstatSync(path, { throwIfNoEntry: false });
  if (!info) throw new ContextError('snapshot_not_found', `snapshot file is missing: ${basename(path)}`);
  if (!info.isFile() || info.isSymbolicLink()) throw new ContextError('snapshot_integrity_error');
  try { return readFileSync(path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new ContextError('snapshot_not_found', `snapshot file is missing: ${basename(path)}`);
  }
}

function prepareCache(repo, cache) {
  mkdirSync(cache, { recursive: true, mode: 0o700 });
  const marker = join(cache, CACHE_MARKER);
  const info = lstatSync(marker, { throwIfNoEntry: false });
  if (!info) {
    const isLegacyDefault = cache === cacheLocation(repo);
    const entries = readdirSync(cache);
    if (entries.length > 0 && !entries.includes(CACHE_MARKER) && !isLegacyDefault) {
      throw new ContextError('invalid_cache_path', 'a custom cache must be empty or already owned by context-ontology');
    }
    if (!entries.includes(CACHE_MARKER)) {
      try { writeFileSync(marker, CACHE_MARKER_CONTENT, { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
  }
  // ponytail: allow up to one second for a concurrent first write; a stalled
  // or abandoned initializer still fails closed and requires an explicit retry.
  for (let attempt = 0; attempt <= 20; attempt += 1) {
    const current = lstatSync(marker, { throwIfNoEntry: false });
    if (!current?.isFile() || current.isSymbolicLink()) break;
    const content = readFileSync(marker, 'utf8');
    if (content === CACHE_MARKER_CONTENT) return;
    if (!CACHE_MARKER_CONTENT.startsWith(content) || attempt === 20) break;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  throw new ContextError('invalid_cache_path', 'cache ownership marker is invalid');
}

function snapshotDirectory(cache, create = false) {
  const directory = join(cache, 'snapshots');
  if (create) {
    try { mkdirSync(directory, { mode: 0o700 }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  const info = lstatSync(directory, { throwIfNoEntry: false });
  if (!info) throw new ContextError('snapshot_not_found', 'snapshots path is missing');
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new ContextError('snapshot_integrity_error', 'snapshots path must be a regular directory');
  }
  return directory;
}

function readSnapshotDirectory(directory, expectedHash, repo, fingerprint) {
  const info = lstatSync(directory, { throwIfNoEntry: false });
  if (!info) throw new ContextError('snapshot_not_found', 'active snapshot directory is missing');
  if (!info.isDirectory() || info.isSymbolicLink()) throw new ContextError('snapshot_integrity_error');
  const bytes = readRegular(join(directory, 'source-manifest.json'));
  if (sha256(bytes) !== expectedHash) throw new ContextError('snapshot_integrity_error', 'manifest hash mismatch');
  const manifest = JSON.parse(bytes);
  if (!manifest.completed || manifest.fingerprint !== fingerprint || manifest.source_root !== repo) {
    throw new ContextError('snapshot_integrity_error', 'incompatible or incomplete snapshot');
  }
  if (manifest.schema_version !== SCHEMA_VERSION || manifest.extractor_version !== EXTRACTOR_VERSION) {
    throw new ContextError('snapshot_incompatible', 'snapshot was built by another schema or extractor version');
  }
  const artifacts = {};
  for (const name of ARTIFACTS) {
    const content = readRegular(join(directory, name));
    if (sha256(content) !== manifest.artifact_hashes[name]) throw new ContextError('snapshot_integrity_error', `hash mismatch: ${name}`);
    artifacts[name] = content;
  }
  const records = (name) => artifacts[name].toString().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  return { manifest, entities: records('entities.jsonl'), relations: records('relations.jsonl'),
    fingerprint, manifest_hash: expectedHash };
}

export function loadSnapshot({ repo, cacheDir }) {
  repo = resolveRepo(repo);
  const cache = cacheLocation(repo, cacheDir);
  if (!existsSync(join(cache, 'active.json'))) throw new ContextError('index_not_built');
  try {
    const snapshots = snapshotDirectory(cache);
    const active = JSON.parse(readRegular(join(cache, 'active.json')));
    if (!/^[a-f0-9]{64}$/.test(active.fingerprint) || !/^[a-f0-9]{64}$/.test(active.manifest_hash)) {
      throw new ContextError('snapshot_integrity_error');
    }
    return readSnapshotDirectory(join(snapshots, active.fingerprint), active.manifest_hash, repo, active.fingerprint);
  } catch (error) {
    if (error instanceof ContextError) throw error;
    throw new ContextError('snapshot_integrity_error', 'cannot read a complete verified snapshot');
  }
}

export function buildSnapshot({ repo, cacheDir, scopes = DEFAULT_SCOPES, committedOnly = false }) {
  repo = resolveRepo(repo);
  scopes = normalizeScopes(scopes);
  const cache = cacheLocation(repo, cacheDir);
  prepareCache(repo, cache);
  let temporary;
  let pointer;
  let fingerprint;
  try {
    if (git(repo, ['rev-parse', '--is-shallow-repository']).toString().trim() === 'true') {
      throw new ContextError('shallow_history_unsupported', 'Complete Git history is required for reproducible source update times');
    }
    const state = getRepoState(repo);
    if (state.dirty && !committedOnly) throw new ContextError('unindexed_worktree', 'use --committed-only to index the committed revision explicitly');
    const repoId = configuredRepoId();
    const inputs = { repo_id: repoId, source_root: repo, revision: state.revision, indexed_paths: scopes,
      schema_version: SCHEMA_VERSION, extractor_version: EXTRACTOR_VERSION };
    fingerprint = sha256(stableJson(inputs));
    const files = listMarkdown(repo, state.revision, scopes);
    const blobs = readBlobs(repo, files);
    const times = sourceUpdatedTimes(repo, state.revision, files);
    const parsed = files.map((file) => extractMarkdown({ path: file.path, content: blobs.get(file.path),
      repoId, revision: state.revision, updatedAt: times.get(file.path) }));
    const { entities, relations, gaps } = graph(parsed);
    const artifacts = {
      'schema.json': jsonFile({ schema_version: SCHEMA_VERSION, entities: ['Document', 'Section', 'RelationAssertion'], predicates: PREDICATES }),
      'entities.jsonl': entities.map(jsonFile).join(''),
      'relations.jsonl': relations.map(jsonFile).join(''),
    };
    const counts = { documents: files.length, units: entities.length - files.length,
      relations: relations.length, coverage_gaps: gaps.length };
    const manifest = { ...inputs, source_id: repoId, fingerprint,
      excluded_paths: ['**/AGENTS.md', '**/CLAUDE.md'], completed: true, counts,
      artifact_hashes: Object.fromEntries(ARTIFACTS.map((name) => [name, sha256(artifacts[name])])),
      coverage_gaps: gaps };
    const manifestBytes = jsonFile(manifest);
    const manifestHash = sha256(manifestBytes);
    const snapshots = snapshotDirectory(cache, true);
    temporary = mkdtempSync(join(cache, '.building-'));
    for (const [name, content] of Object.entries(artifacts)) writeFileSync(join(temporary, name), content, { mode: 0o600 });
    writeFileSync(join(temporary, 'source-manifest.json'), manifestBytes, { mode: 0o600 });
    const snapshot = readSnapshotDirectory(temporary, manifestHash, repo, fingerprint);
    const destination = join(snapshots, fingerprint);
    const release = lockCache(cache);
    try {
      snapshotDirectory(cache);
      const latest = getRepoState(repo);
      if (latest.revision !== state.revision) throw new ContextError('source_changed_during_build');
      if (latest.dirty && !committedOnly) throw new ContextError('unindexed_worktree');
      // Under the lock the destination is ours: reuse it when it verifies,
      // rebuild it from the snapshot just built when files are missing, and
      // still refuse tampered or symlinked content loudly.
      let reused = false;
      const existing = lstatSync(destination, { throwIfNoEntry: false });
      if (existing) {
        if (!existing.isDirectory() || existing.isSymbolicLink()) throw new ContextError('snapshot_integrity_error');
        try {
          const previous = readRegular(join(destination, 'source-manifest.json'));
          if (sha256(previous) !== manifestHash) throw new ContextError('non_deterministic_build');
          readSnapshotDirectory(destination, manifestHash, repo, fingerprint);
          reused = true;
        } catch (error) {
          if (error.code !== 'snapshot_not_found') throw error;
          rmSync(destination, { recursive: true, force: true });
        }
      }
      if (!reused) {
        renameSync(temporary, destination);
        temporary = undefined;
      }
      pointer = join(cache, `.active-${process.pid}-${randomUUID()}.json`);
      writeFileSync(pointer, jsonFile({ fingerprint, manifest_hash: manifestHash }), { mode: 0o600 });
      renameSync(pointer, join(cache, 'active.json'));
      pointer = undefined;
      const warnings = recordRun(cache, { fingerprint,
        status: 'completed', committed_only: committedOnly, worktree_dirty: latest.dirty });
      const pruned = pruneCache(cache, fingerprint, warnings);
      return { fingerprint, manifest, counts, reused, warnings, snapshot,
        pruned_snapshots: pruned.snapshots, pruned_temporaries: pruned.temporaries };
    } finally {
      release();
    }
  } catch (error) {
    recordRun(cache, { fingerprint: fingerprint ?? null, status: 'failed', error: error.code ?? 'build_failed' });
    throw error;
  } finally {
    if (temporary) rmSync(temporary, { recursive: true, force: true });
    if (pointer) rmSync(pointer, { force: true });
  }
}

// Serializes reuse verification, activation and pruning across processes. The
// symlink target combines pid and a random token so release cannot remove a
// successor's lock. Readers remain lock-free.
function lockCache(cache) {
  const lock = join(cache, '.lock');
  const owner = `${process.pid}-${randomUUID()}`;
  const started = Date.now();
  for (;;) {
    try {
      symlinkSync(owner, lock);
      return () => { if (readLockOwner(lock)?.token === owner) rmSync(lock, { force: true }); };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    const holder = readLockOwner(lock);
    if (holder === null) continue;
    if (!holder) throw new ContextError('snapshot_integrity_error', 'cache lock is not a valid owner symlink');
    try { process.kill(holder.pid, 0); }
    catch (error) {
      if (error.code === 'ESRCH') {
        if (readLockOwner(lock)?.token !== holder.token) continue;
        // ponytail: require manual stale-lock removal; use a native advisory lock
        // if unattended crash recovery becomes necessary.
        throw new ContextError('cache_lock_stale', 'cache lock owner is gone; remove the lock only after confirming no build is running');
      }
      if (error.code !== 'EPERM') throw new ContextError('snapshot_integrity_error', 'cache lock owner pid is invalid');
    }
    if (Date.now() - started > LOCK_WAIT_MS) {
      throw new ContextError('cache_lock_timeout', 'timed out waiting for the cache lock');
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
}

function readLockOwner(lock) {
  try {
    const token = readlinkSync(lock);
    const match = /^([1-9]\d*)-[a-f0-9-]{36}$/.exec(token);
    const pid = Number(match?.[1]);
    return Number.isSafeInteger(pid) && pid <= 0x7fffffff ? { pid, token } : undefined;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    return undefined;
  }
}

// Runs under the cache lock. Removes every fingerprint-named snapshot except
// the one just activated, plus temporary build, pointer and reclaimed-lock
// entries older than LOCK_WAIT_MS (a live build's temporary work is seconds old).
function pruneCache(cache, keep, warnings) {
  const pruned = { snapshots: 0, temporaries: 0 };
  try {
    const snapshots = snapshotDirectory(cache);
    for (const entry of readdirSync(snapshots)) {
      if (entry === keep || !/^[a-f0-9]{64}$/.test(entry)) continue;
      rmSync(join(snapshots, entry), { recursive: true, force: true });
      pruned.snapshots += 1;
    }
    for (const entry of readdirSync(cache)) {
      if (!entry.startsWith('.building-') && !entry.startsWith('.active-') && !entry.startsWith('.lock.dead-')) continue;
      const path = join(cache, entry);
      if (Date.now() - lstatSync(path).mtimeMs <= LOCK_WAIT_MS) continue;
      rmSync(path, { recursive: true, force: true });
      pruned.temporaries += 1;
    }
  } catch {
    warnings.push('prune_unavailable');
  }
  return pruned;
}

function recordRun(cache, record) {
  try {
    appendFileSync(join(cache, 'runs.jsonl'), jsonFile({ observed_at: new Date().toISOString(), ...record }), { mode: 0o600 });
    return [];
  } catch {
    return ['run_log_unavailable'];
  }
}
