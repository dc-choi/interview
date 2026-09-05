import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join, posix, relative, resolve, sep } from 'node:path';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { ASSERTION_PREDICATES, STRUCTURAL_PREDICATES, ContextError, normalizeScopes, sha256, stableJson } from './core.mjs';
import { getRepoState, git, listMarkdown, readBlobs, resolveRepo, sourceUpdatedTimes } from './repository.mjs';
import { extractMarkdown, normalizeHeading } from './markdown.mjs';

const SCHEMA_VERSION = '1';
const EXTRACTOR_VERSION = '9';
const ARTIFACTS = ['schema.json', 'entities.jsonl', 'relations.jsonl'];
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

function relation(subject, predicate, object, evidence, occurrence) {
  return {
    id: `edge:sha256:${sha256(stableJson([subject, predicate, object, evidence, occurrence]))}`,
    subject, predicate, object, evidence_unit_id: evidence, assertion_occurrence: occurrence,
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
          link.evidence_unit_id, link.assertion_occurrence));
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
  if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new ContextError('snapshot_integrity_error');
  return readFileSync(path);
}

function readSnapshotDirectory(directory, expectedHash, repo, fingerprint) {
  if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) {
    throw new ContextError('snapshot_integrity_error');
  }
  const bytes = readRegular(join(directory, 'source-manifest.json'));
  if (sha256(bytes) !== expectedHash) throw new ContextError('snapshot_integrity_error', 'manifest hash mismatch');
  const manifest = JSON.parse(bytes);
  if (!manifest.completed || manifest.fingerprint !== fingerprint || manifest.source_root !== repo
    || manifest.schema_version !== SCHEMA_VERSION || manifest.extractor_version !== EXTRACTOR_VERSION) {
    throw new ContextError('snapshot_integrity_error', 'incompatible or incomplete snapshot');
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
    const active = JSON.parse(readRegular(join(cache, 'active.json')));
    if (!/^[a-f0-9]{64}$/.test(active.fingerprint) || !/^[a-f0-9]{64}$/.test(active.manifest_hash)) {
      throw new ContextError('snapshot_integrity_error');
    }
    return readSnapshotDirectory(join(cache, 'snapshots', active.fingerprint), active.manifest_hash, repo, active.fingerprint);
  } catch (error) {
    if (error instanceof ContextError) throw error;
    throw new ContextError('snapshot_integrity_error', 'cannot read a complete verified snapshot');
  }
}

export function buildSnapshot({ repo, cacheDir, scopes = ['tech'], committedOnly = false }) {
  repo = resolveRepo(repo);
  scopes = normalizeScopes(scopes);
  const cache = cacheLocation(repo, cacheDir);
  mkdirSync(cache, { recursive: true, mode: 0o700 });
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
    mkdirSync(join(cache, 'snapshots'), { recursive: true, mode: 0o700 });
    temporary = mkdtempSync(join(cache, '.building-'));
    for (const [name, content] of Object.entries(artifacts)) writeFileSync(join(temporary, name), content, { mode: 0o600 });
    writeFileSync(join(temporary, 'source-manifest.json'), manifestBytes, { mode: 0o600 });
    readSnapshotDirectory(temporary, manifestHash, repo, fingerprint);
    const latest = getRepoState(repo);
    if (latest.revision !== state.revision) throw new ContextError('source_changed_during_build');
    if (latest.dirty && !committedOnly) throw new ContextError('unindexed_worktree');
    const destination = join(cache, 'snapshots', fingerprint);
    let reused = existsSync(destination);
    if (!reused) {
      try { renameSync(temporary, destination); temporary = undefined; }
      catch (error) {
        if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
        reused = true;
      }
    }
    if (reused) {
      const previous = readRegular(join(destination, 'source-manifest.json'));
      if (sha256(previous) !== manifestHash) throw new ContextError('non_deterministic_build');
      readSnapshotDirectory(destination, manifestHash, repo, fingerprint);
    }
    pointer = join(cache, `.active-${process.pid}-${randomUUID()}.json`);
    writeFileSync(pointer, jsonFile({ fingerprint, manifest_hash: manifestHash }), { mode: 0o600 });
    renameSync(pointer, join(cache, 'active.json'));
    pointer = undefined;
    const warnings = recordRun(cache, { fingerprint,
      status: 'completed', committed_only: committedOnly, worktree_dirty: latest.dirty });
    return { fingerprint, manifest, counts, reused, warnings };
  } catch (error) {
    recordRun(cache, { fingerprint: fingerprint ?? null, status: 'failed', error: error.code ?? 'build_failed' });
    throw error;
  } finally {
    if (temporary) rmSync(temporary, { recursive: true, force: true });
    if (pointer) rmSync(pointer, { force: true });
  }
}

function recordRun(cache, record) {
  try {
    appendFileSync(join(cache, 'runs.jsonl'), jsonFile({ observed_at: new Date().toISOString(), ...record }), { mode: 0o600 });
    return [];
  } catch {
    return ['run_log_unavailable'];
  }
}
