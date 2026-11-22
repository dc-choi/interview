import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join, posix, relative, resolve, sep } from 'node:path';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync, appendFileSync } from 'node:fs';
import { DEFAULT_SCOPES, ContextError, conceptSlug, labelKey, normalizeScopes, sha256, stableJson } from './core.mjs';
import { getRepoState, git, listMarkdown, readBlobs, resolveRepo, sourceUpdatedTimes } from './repository.mjs';
import { extractMarkdown, normalizeHeading, wikilinkTarget } from './markdown.mjs';
import {
  CLASSES, CLASS_BY_NAME, EXTRACTOR_VERSION, PREDICATES, PREDICATE_BY_NAME, SCHEMA_VERSION,
  allowsObject, allowsSubject, hasCharacteristic,
} from './schema.mjs';

const ARTIFACTS = ['schema.json', 'entities.jsonl', 'relations.jsonl'];
const CACHE_MARKER = '.context-ontology-cache';
const CACHE_MARKER_CONTENT = 'interview-context-ontology-v1\n';
const LOCK_WAIT_MS = 10 * 60 * 1000;
const key = (text) => text.normalize('NFC').toLowerCase();
const byId = (a, b) => a.id < b.id ? -1 : Number(a.id > b.id);
const jsonFile = (value) => `${stableJson(value)}\n`;
let parsedRecordsCache;

export function configuredRepoId() {
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

export function linkResolver(documents, units) {
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

// Builds the asserted graph and validates it against the schema. A violation is
// a coverage gap and never an edge or entity; inference is left to query time.
export function graph(records, repoId) {
  const documents = records.map((record) => record.document);
  const units = records.flatMap((record) => record.units);
  const resolveLink = linkResolver(documents, units);
  const relations = [];
  const gaps = [];
  const gapFor = (source, unitId) => (reason, message) => gaps.push({ source_uri: source, reason,
    evidence_unit_id: unitId, message });
  // An evidence wikilink must resolve to exactly one Section.
  const evidenceSection = (link, source) => {
    const target = wikilinkTarget(link);
    const match = target === undefined ? { reason: 'not_a_wikilink' } : resolveLink(target, source);
    return match.entity?.type === 'Section' ? match : { reason: match.reason ?? 'not_a_section' };
  };
  const concepts = new Map();
  const declarationOf = new Map();
  const broaderRequests = [];
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
    // Records arrive in path order, so the first materialized declaration of a
    // slug wins; a rejected one does not claim the slug.
    for (const declaration of record.concepts) {
      const gap = gapFor(source, declaration.evidence_unit_id);
      if (concepts.has(declaration.id)) {
        gap('duplicate_concept_id', `${declaration.id} is already declared in ${concepts.get(declaration.id).source_uri}.`);
        continue;
      }
      const required = CLASS_BY_NAME.get(declaration.type).evidence_required;
      const evidence = declaration.evidence === undefined ? null : evidenceSection(declaration.evidence, source);
      if (evidence?.reason || (!evidence && required)) {
        gap('missing_evidence', evidence ? `evidence ${declaration.evidence} does not resolve to one Section: ${evidence.reason}.`
          : `${declaration.type} requires an evidence wikilink to one Section.`);
        if (required) continue;
      }
      concepts.set(declaration.id, { id: declaration.id, type: declaration.type, label: declaration.label,
        aliases: declaration.aliases, source_uri: source, source_revision: record.document.source_revision });
      declarationOf.set(declaration.id, declaration.evidence_unit_id);
      relations.push(relation(record.document.id, 'declares', declaration.id, declaration.evidence_unit_id, 1));
      if (evidence?.entity) {
        relations.push(relation(declaration.id, 'supported_by', evidence.entity.id, declaration.evidence_unit_id, 1));
      }
      if (declaration.broader) broaderRequests.push({ declaration, source });
    }
  }

  const broader = [];
  for (const { declaration, source } of broaderRequests) {
    const object = `concept:${repoId}:${declaration.broader}`;
    if (!concepts.has(object)) {
      gaps.push({ source_uri: source, reason: 'unresolved_relation', evidence_unit_id: declaration.evidence_unit_id });
    } else if (object === declaration.id) {
      gapFor(source, declaration.evidence_unit_id)('reflexive_relation', `${declaration.id} cannot be broader than itself.`);
    } else {
      broader.push({ source, edge: relation(declaration.id, 'broader', object, declaration.evidence_unit_id, 1) });
    }
  }

  const entityById = new Map([...documents, ...units, ...concepts.values()].map((entity) => [entity.id, entity]));
  // Subject and target take a canonical ID, the shorthand concept:<slug>, or a wikilink.
  const endpoint = (value, source) => {
    const target = wikilinkTarget(value);
    if (target !== undefined) return resolveLink(target, source).entity;
    return entityById.get(/^concept:[^:]+$/.test(value) ? `concept:${repoId}:${value.slice(8)}` : value);
  };
  for (const record of records) {
    const source = record.document.source_uri;
    for (const assertion of record.assertions) {
      const predicate = PREDICATE_BY_NAME.get(assertion.predicate);
      const subject = assertion.subject === undefined ? record.document : endpoint(assertion.subject, source);
      const object = endpoint(assertion.target, source);
      if (!predicate?.authorable || !subject || !object) {
        gaps.push({ source_uri: source, reason: 'unresolved_relation',
          evidence_unit_id: assertion.evidence_unit_id });
        continue;
      }
      const gap = gapFor(source, assertion.evidence_unit_id);
      if (!allowsSubject(predicate, subject.type)) {
        gap('domain_violation', `${predicate.name} requires subject type ${predicate.domain.join(' or ')}, not ${subject.type} ${subject.id}.`);
        continue;
      }
      if (!allowsObject(predicate, object.type)) {
        gap('range_violation', `${predicate.name} requires target type ${predicate.range.join(' or ')}, not ${object.type} ${object.id}.`);
        continue;
      }
      if (hasCharacteristic(predicate, 'irreflexive') && subject.id === object.id) {
        gap('reflexive_relation', `${predicate.name} cannot relate ${subject.id} to itself.`);
        continue;
      }
      const evidence = assertion.evidence === undefined ? null : evidenceSection(assertion.evidence, source);
      if (evidence?.reason || (!evidence && predicate.evidence_required)) {
        gap('missing_evidence', evidence ? `evidence ${assertion.evidence} does not resolve to one Section: ${evidence.reason}.`
          : `${predicate.name} requires an evidence wikilink to one Section.`);
        if (predicate.evidence_required) continue;
      }
      const edge = relation(subject.id, predicate.name, object.id, assertion.evidence_unit_id, assertion.assertion_occurrence);
      const support = evidence?.entity
        ? relation(assertion.evidence_unit_id, 'supported_by', evidence.entity.id, assertion.evidence_unit_id, 1) : null;
      if (predicate.name === 'broader') broader.push({ source, edge, support });
      else relations.push(edge, ...(support ? [support] : []));
    }
  }

  // ponytail: depth-first reachability per broader edge, O(E^2); the hierarchy is
  // small. Edges are added in (subject, object, source) order, so a cycle drops its
  // last edge in that order. Edge IDs hash list positions and only break exact ties,
  // whose edges share one fate, so inserting a declaration never moves the drop.
  const rank = ({ source, edge }) => `${edge.subject}\0${edge.object}\0${source}\0${edge.id}`;
  const parents = new Map();
  const reaches = (from, to) => {
    const stack = [from];
    const seen = new Set();
    while (stack.length > 0) {
      const node = stack.pop();
      if (node === to) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      stack.push(...(parents.get(node) ?? []));
    }
    return false;
  };
  for (const { source, edge, support } of broader.sort((a, b) => rank(a) < rank(b) ? -1 : Number(rank(a) > rank(b)))) {
    if (reaches(edge.object, edge.subject)) {
      gapFor(source, edge.evidence_unit_id)('hierarchy_cycle', `${edge.subject} broader ${edge.object} closes a cycle.`);
      continue;
    }
    parents.set(edge.subject, [...(parents.get(edge.subject) ?? []), edge.object]);
    relations.push(edge, ...(support ? [support] : []));
  }

  // Label index: a key shared by two concepts resolves to nobody.
  const owners = new Map();
  for (const concept of concepts.values()) {
    for (const name of [conceptSlug(concept.id), concept.label, ...concept.aliases]) {
      const nameKey = labelKey(name);
      if (nameKey) owners.set(nameKey, (owners.get(nameKey) ?? new Set()).add(concept.id));
    }
  }
  const labelIndex = new Map();
  for (const [nameKey, ids] of owners) {
    if (ids.size === 1) {
      labelIndex.set(nameKey, [...ids][0]);
      continue;
    }
    for (const id of ids) {
      gapFor(concepts.get(id).source_uri, declarationOf.get(id))('concept_label_collision',
        `label key ${nameKey} is shared by ${[...ids].join(', ')}.`);
    }
  }
  const categoryKeys = new Map();
  for (const concept of concepts.values()) {
    if (concept.type !== 'Category') continue;
    for (const name of [concept.label, ...concept.aliases]) {
      if (labelIndex.get(labelKey(name)) === concept.id) categoryKeys.set(labelKey(name), concept.id);
    }
  }
  const declaresCategories = [...concepts.values()].some((concept) => concept.type === 'Category');
  const tagKeys = new Set();
  const mappedTags = new Set();
  const unmappedCategories = new Set();
  for (const record of records) {
    const doc = record.document;
    const root = record.units.find((unit) => unit.type === 'Section' && unit.anchor.heading_path.length === 0);
    const tagged = new Set();
    for (const tag of doc.tags) {
      const tagKey = labelKey(tag);
      if (!tagKey) continue;
      tagKeys.add(tagKey);
      const concept = labelIndex.get(tagKey);
      if (!concept) continue;
      mappedTags.add(tagKey);
      if (!tagged.has(concept)) relations.push(relation(doc.id, 'tagged_with', concept, root.id, 1));
      tagged.add(concept);
    }
    if (!doc.category) continue;
    const category = categoryKeys.get(labelKey(doc.category));
    if (category) {
      relations.push(relation(doc.id, 'in_category', category, root.id, 1));
      continue;
    }
    unmappedCategories.add(labelKey(doc.category));
    if (declaresCategories) {
      gapFor(doc.source_uri, root.id)('undeclared_category', `category ${doc.category} has no Category concept.`);
    }
  }

  const entities = [...entityById.values()].sort(byId);
  if (entities.length !== documents.length + units.length + concepts.size) throw new ContextError('duplicate_entity_id');
  relations.sort(byId);
  gaps.sort((a, b) => stableJson(a) < stableJson(b) ? -1 : Number(stableJson(a) > stableJson(b)));
  return { entities, relations, gaps, stats: {
    concepts: concepts.size,
    typed_relations: relations.filter((item) => PREDICATE_BY_NAME.get(item.predicate).authorable).length,
    tags_distinct: tagKeys.size,
    tags_mapped: mappedTags.size,
    tags_unmapped: tagKeys.size - mappedTags.size,
    categories_unmapped: unmappedCategories.size,
  } };
}

/**
 * Parses one Git tree into the validated in-memory graph without writing a snapshot.
 * A Markdown file that is not UTF-8 stays out of the graph as an invalid_source_encoding
 * gap, so validate reports it; buildSnapshot still stops on it and keeps the active snapshot.
 */
export function graphTree(repo, tree, { revision = tree, parsed = new Map() } = {}) {
  const repoId = configuredRepoId();
  const files = listMarkdown(repo, tree, DEFAULT_SCOPES);
  const id = (file) => `${file.path}\0${file.oid}`;
  const pending = files.filter((file) => !parsed.has(id(file)));
  const blobs = readBlobs(repo, pending);
  for (const file of pending) {
    try {
      parsed.set(id(file), extractMarkdown({ path: file.path, content: blobs.get(file.path), repoId, revision }));
    } catch (error) {
      if (error.code !== 'invalid_source_encoding') throw error;
      parsed.set(id(file), { source_uri: file.path, reason: error.code, message: error.message });
    }
  }
  const records = files.map((file) => parsed.get(id(file)));
  const result = graph(records.filter((record) => record.document), repoId);
  result.gaps.push(...records.filter((record) => !record.document));
  return { files, ...result };
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

function freezeParsed(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeParsed(child);
    Object.freeze(value);
  }
  return value;
}

// Device, inode, size, mtime and ctime of a regular artifact file, or null.
function artifactIdentity(path) {
  const info = lstatSync(path, { bigint: true, throwIfNoEntry: false });
  return info?.isFile() && !info.isSymbolicLink()
    ? { key: `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`, ctimeNs: info.ctimeNs } : null;
}

// Records of the last verified load. A load under the same manifest reuses them without
// reading and hashing the artifacts again while each artifact file keeps the identity it had
// when verified: a write changes its ctime and a replacement its inode or ctime. Identities
// are kept only when every ctime precedes the verifying read by two seconds, so a write in
// the same timestamp tick of a coarse file system still changes them, as Git treats racily
// clean index entries.
function verifiedRecords(directory, manifest, repo, fingerprint, manifestHash) {
  const startedNs = BigInt(Date.now()) * 1_000_000n;
  const identities = ARTIFACTS.map((name) => artifactIdentity(join(directory, name)));
  const keys = identities.every(Boolean) ? identities.map((identity) => identity.key).join('\n') : null;
  const cached = parsedRecordsCache;
  const sameManifest = cached?.repo === repo && cached.fingerprint === fingerprint && cached.manifestHash === manifestHash;
  if (sameManifest && keys !== null && cached.keys === keys) return cached;
  const artifacts = {};
  for (const name of ARTIFACTS) {
    const content = readRegular(join(directory, name));
    if (sha256(content) !== manifest.artifact_hashes[name]) throw new ContextError('snapshot_integrity_error', `hash mismatch: ${name}`);
    artifacts[name] = content;
  }
  const records = (name) => artifacts[name].toString().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const settled = keys !== null && identities.every((identity) => identity.ctimeNs < startedNs - 2_000_000_000n);
  parsedRecordsCache = {
    repo,
    fingerprint,
    manifestHash,
    keys: settled ? keys : null,
    entities: sameManifest ? cached.entities : freezeParsed(records('entities.jsonl')),
    relations: sameManifest ? cached.relations : freezeParsed(records('relations.jsonl')),
  };
  return parsedRecordsCache;
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
  const parsed = verifiedRecords(directory, manifest, repo, fingerprint, expectedHash);
  return { manifest, entities: [...parsed.entities], relations: [...parsed.relations],
    fingerprint, manifest_hash: expectedHash };
}

/** `root` is resolveRepo(repo) when the caller already resolved it for this request. */
export function loadSnapshot({ repo, cacheDir }, root = resolveRepo(repo)) {
  repo = root;
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
    const { entities, relations, gaps, stats } = graph(parsed, repoId);
    const artifacts = {
      'schema.json': jsonFile({ schema_version: SCHEMA_VERSION, classes: CLASSES, predicates: PREDICATES }),
      'entities.jsonl': entities.map(jsonFile).join(''),
      'relations.jsonl': relations.map(jsonFile).join(''),
    };
    const counts = { documents: files.length, units: entities.length - files.length - stats.concepts,
      relations: relations.length, coverage_gaps: gaps.length, ...stats };
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
