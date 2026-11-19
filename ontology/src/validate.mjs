import { readFileSync } from 'node:fs';
import { stableJson } from './core.mjs';
import { wikilinkTarget } from './markdown.mjs';
import { git, readBlobs, resolveRepo } from './repository.mjs';
import { CONCEPT_TYPES, PREDICATE_BY_NAME, allowsObject, allowsSubject, hasCharacteristic } from './schema.mjs';
import { configuredRepoId, graphTree, linkResolver } from './snapshot.mjs';

const ONTOLOGY_GAPS = new Set([
  'MalformedFrontmatter', 'InvalidOntologyRelations', 'UnsupportedOntologyAlias', 'InvalidOntologyRelation',
  'UnverifiedOntologyRelation', 'UnsupportedOntologyPredicate', 'unresolved_relation',
  'invalid_concept_declaration', 'unsupported_concept_type', 'duplicate_concept_id', 'concept_label_collision',
  'domain_violation', 'range_violation', 'reflexive_relation', 'missing_evidence', 'hierarchy_cycle',
  'undeclared_category',
]);
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const COMMON_FIELDS = ['id', 'kind', 'home', 'evidence', 'status', 'proposed_by', 'proposed_at',
  'reviewed_by', 'reviewed_at', 'review_note'];
const KIND_FIELDS = { concept: ['slug', 'type', 'label', 'aliases', 'broader'], relation: ['subject', 'predicate', 'target'] };
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const normalizeText = (value) => value.normalize('NFC').replace(/\s+/gu, ' ').trim();
// List positions are left out, so inserting one item does not make the
// unchanged violations after it look new.
const identity = (gap) => stableJson(gap).replace(/\[\d+\]/g, '[]');
const categories = (result) => stableJson(result.entities.filter((entity) => entity.type === 'Category')
  .map(({ id, label, aliases }) => [id, label, [...aliases].sort()]));
const headRevision = (repo) => git(repo, ['rev-parse', '--verify', 'HEAD^{commit}']).toString().trim();

/**
 * Validates the ontology of the HEAD tree, or with `staged` the index tree from
 * `git write-tree`. Staged mode fails only for violations the staged change adds.
 * A new undeclared_category comes from an ordinary document's category string, so
 * it blocks only a change to the Category concepts and is a warning otherwise.
 */
export function validateOntology({ repo, staged = false }) {
  repo = resolveRepo(repo);
  const revision = headRevision(repo);
  const parsed = new Map();
  const head = graphTree(repo, revision, { revision, parsed });
  const ontologyGaps = (result) => result.gaps.filter((gap) => ONTOLOGY_GAPS.has(gap.reason));
  const counts = (result) => ({ documents: result.files.length, ...result.stats, ontology_gaps: ontologyGaps(result).length });
  if (!staged) {
    const gaps = ontologyGaps(head);
    return { ok: gaps.length === 0, mode: 'head', revision, counts: counts(head), gaps };
  }
  const tree = git(repo, ['write-tree']).toString().trim();
  const index = tree === git(repo, ['rev-parse', `${revision}^{tree}`]).toString().trim()
    ? head : graphTree(repo, tree, { revision, parsed });
  const remaining = new Map();
  for (const gap of ontologyGaps(head)) remaining.set(identity(gap), (remaining.get(identity(gap)) ?? 0) + 1);
  const violations = [];
  const warnings = [];
  const categoriesChanged = categories(head) !== categories(index);
  for (const gap of ontologyGaps(index)) {
    const count = remaining.get(identity(gap)) ?? 0;
    if (count > 0) remaining.set(identity(gap), count - 1);
    if (count === 0 && (categoriesChanged || gap.reason !== 'undeclared_category')) violations.push(gap);
    else warnings.push(gap);
  }
  return { ok: violations.length === 0, mode: 'staged', revision, tree, counts: counts(index), violations, warnings };
}

/**
 * Checks a candidate queue JSONL file against the HEAD tree: shape, class and
 * predicate, domain and range, evidence Section and the verbatim quote.
 * Rejected lines are review records and get shape checks only; they neither
 * propose a concept nor resolve against HEAD.
 */
export function checkCandidates({ repo, file }) {
  repo = resolveRepo(repo);
  const revision = headRevision(repo);
  const repoId = configuredRepoId();
  const { files, entities } = graphTree(repo, revision);
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const resolveLink = linkResolver(entities.filter((entity) => entity.type === 'Document'),
    entities.filter((entity) => entity.anchor));
  const rows = readFileSync(file, 'utf8').split('\n').map((text, index) => ({ line: index + 1, text }))
    .filter((row) => row.text.trim());
  const problems = [];
  for (const row of rows) {
    try { row.value = JSON.parse(row.text); }
    catch { problems.push({ line: row.line, problem: 'line is not valid JSON' }); }
  }
  const conceptId = (value) => /^concept:[^:]+$/.test(value) ? `concept:${repoId}:${value.slice(8)}` : value;
  const proposed = new Map(rows.filter((row) => row.value?.kind === 'concept' && row.value.status !== 'rejected'
    && typeof row.value.slug === 'string').map((row) => [`concept:${repoId}:${row.value.slug}`, row.value.type]));
  const known = (id) => entityById.get(id) ?? (proposed.has(id) ? { id, type: proposed.get(id) } : undefined);
  const ids = new Set();
  const slugs = new Map();
  const quotes = [];
  for (const row of rows.filter((item) => item.value !== undefined)) {
    const value = row.value;
    const problem = (message) => problems.push({ line: row.line, ...(isText(value?.id) ? { id: value.id } : {}), problem: message });
    if (!isObject(value)) {
      problem('line must be a JSON object');
      continue;
    }
    if (!isText(value.id)) problem('id must be a non-empty string');
    else if (ids.has(value.id)) problem(`id ${value.id} is duplicated`);
    ids.add(value.id);
    if (!Object.hasOwn(KIND_FIELDS, value.kind)) {
      problem('kind must be concept or relation');
      continue;
    }
    const unknown = Object.keys(value).filter((field) => !COMMON_FIELDS.includes(field) && !KIND_FIELDS[value.kind].includes(field));
    if (unknown.length > 0) problem(`unsupported fields: ${unknown.join(', ')}`);
    if (!['candidate', 'approved', 'rejected'].includes(value.status)) problem('status must be candidate, approved or rejected');
    const required = ['proposed_by', 'proposed_at', ...(['approved', 'rejected'].includes(value.status) ? ['reviewed_by', 'reviewed_at'] : [])];
    for (const field of required) if (!isText(value[field])) problem(`${field} must be a non-empty string`);
    if (value.review_note !== undefined && typeof value.review_note !== 'string') problem('review_note must be a string');
    const evidence = value.evidence;
    const evidenceShape = isObject(evidence) && ['path', 'heading', 'quote'].every((field) => isText(evidence[field]))
      && Object.keys(evidence).length === 3;
    if (!evidenceShape) problem('evidence must be {path, heading, quote} with non-empty strings');
    if (value.status === 'rejected') continue;
    const home = typeof value.home === 'string' ? entityById.get(`document:${repoId}:${value.home}`) : undefined;
    if (home?.type !== 'Document') problem(`home ${value.home} is not an indexed document`);

    if (value.kind === 'concept') {
      if (typeof value.slug !== 'string' || !SLUG.test(value.slug)) problem(`slug must match ${SLUG.source}`);
      else if (slugs.has(value.slug)) problem(`slug ${value.slug} is already proposed on line ${slugs.get(value.slug)}`);
      else slugs.set(value.slug, row.line);
      if (!CONCEPT_TYPES.includes(value.type)) problem(`type must be one of ${CONCEPT_TYPES.join(', ')}`);
      if (!isText(value.label)) problem('label must be a non-empty string');
      if (value.aliases !== undefined && (!Array.isArray(value.aliases) || !value.aliases.every(isText))) {
        problem('aliases must be an array of non-empty strings');
      }
      if (value.broader !== undefined && (typeof value.broader !== 'string' || !SLUG.test(value.broader))) {
        problem('broader must be a concept slug');
      } else if (value.broader !== undefined && !known(`concept:${repoId}:${value.broader}`)) {
        problem(`broader ${value.broader} does not resolve to an indexed or proposed concept`);
      }
    } else {
      const predicate = PREDICATE_BY_NAME.get(value.predicate);
      // An endpoint is an indexed entity, a concept candidate in this file, or a wikilink from home.
      // Approved lines move into a declaration document, so [[#Heading]] would point elsewhere.
      const local = ['subject', 'target'].filter((field) => wikilinkTarget(String(value[field]))?.startsWith('#'));
      for (const field of local) {
        problem(`${field} ${value[field]} is a same-document wikilink; name the document, because approved lines move into a declaration document`);
      }
      // An omitted subject means the home Document here but the declaration document after promotion.
      if (value.subject === undefined) problem('subject is required in a candidate line, because approved lines move into a declaration document');
      const endpoint = (field) => {
        const raw = value[field];
        if (typeof raw !== 'string') return undefined;
        const target = wikilinkTarget(raw);
        if (target !== undefined) return home ? resolveLink(target, home.source_uri).entity : undefined;
        return known(conceptId(raw));
      };
      if (!predicate?.authorable) problem(`predicate ${value.predicate} is not an authorable predicate`);
      else if (local.length === 0) {
        const [subject, object] = [endpoint('subject'), endpoint('target')];
        if (!subject) problem(`subject ${value.subject ?? '(home)'} does not resolve to an indexed or proposed entity`);
        else if (!allowsSubject(predicate, subject.type)) {
          problem(`domain: ${predicate.name} requires subject type ${predicate.domain.join(' or ')}, not ${subject.type}`);
        }
        if (!object) problem(`target ${value.target} does not resolve to an indexed or proposed entity`);
        else if (!allowsObject(predicate, object.type)) {
          problem(`range: ${predicate.name} requires target type ${predicate.range.join(' or ')}, not ${object.type}`);
        }
        if (hasCharacteristic(predicate, 'irreflexive') && subject && subject.id === object?.id) {
          problem(`${predicate.name} cannot relate an entity to itself`);
        }
      }
    }
    if (!evidenceShape) continue;
    const match = resolveLink(`${evidence.path}#${evidence.heading}`, evidence.path);
    if (match.entity?.type !== 'Section') {
      problem(`evidence ${evidence.path}#${evidence.heading} does not resolve to one Section: ${match.reason ?? 'not_a_section'}`);
    } else quotes.push({ problem, section: match.entity, quote: evidence.quote });
  }
  const paths = new Set(quotes.map((item) => item.section.source_uri));
  const blobs = readBlobs(repo, files.filter((item) => paths.has(item.path)));
  for (const { problem, section, quote } of quotes) {
    const text = blobs.get(section.source_uri).subarray(section.anchor.start_byte, section.anchor.end_byte).toString('utf8');
    if (!normalizeText(text).includes(normalizeText(quote))) {
      problem(`quote does not occur in ${section.source_uri}#${section.anchor.heading_path.at(-1)}`);
    }
  }
  problems.sort((a, b) => a.line - b.line);
  return { ok: problems.length === 0, file, revision, checked_lines: rows.length, problems };
}
