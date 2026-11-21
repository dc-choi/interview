import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { parseDocument, visit as visitYaml } from 'yaml';
import { ASSERTION_PREDICATES, ContextError } from './core.mjs';
import { CONCEPT_TYPES } from './schema.mjs';

const WIKILINK_PATTERN = /\[\[([^\]|\r\n]+?)(?:\\?\|[^\]\r\n]*)?\]\]/g;
const SINGLE_WIKILINK = new RegExp(`^\\s*${WIKILINK_PATTERN.source}\\s*$`);
const CONCEPT_SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const RELATION_FIELDS = ['subject', 'predicate', 'target', 'evidence'];
const CONCEPT_FIELDS = ['id', 'type', 'label', 'aliases', 'evidence', 'broader'];
const INDEX_MEMBER_HEADINGS = new Set(['목차', '하위 영역', '하위 폴더 인덱스', '하위 문서']);
const RELATED_DOCUMENT_HEADINGS = new Set(['관련 문서', '관련문서']);
const PARENT_INDEX_PREFIX = /(?:^|[\s([{"'“‘.!?。！？])상위\s*:\s*$/u;

export function normalizeHeading(text) {
  const tree = fromMarkdown(`# ${text.replace(/[\r\n]+/g, ' ')}`);
  const value = tree.children.map((node) => inlineText(node)).join('');
  return value.replace(/\s+/g, ' ').trim();
}

/** Returns the target of a string that is exactly one wikilink, such as `[[Doc#Heading|label]]`. */
export function wikilinkTarget(value) {
  return SINGLE_WIKILINK.exec(value)?.[1].trim() || undefined;
}

export function extractMarkdown({ path, content, repoId, revision, updatedAt }) {
  const source = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (!isUtf8(source)) throw new ContextError('invalid_source_encoding', `Markdown must be UTF-8: ${path}`);
  const text = source.toString('utf8');
  const frontmatter = readFrontmatter(text);
  const bodyStart = frontmatter.end;
  const tree = fromMarkdown(text.slice(bodyStart));
  const headings = findHeadings(tree, bodyStart);
  const sections = createSections({ headings, path, repoId, revision, updatedAt, source, text });
  const metadata = readMetadata(frontmatter, path);
  const anchored = { frontmatter, path, repoId, revision, updatedAt, source, text };
  const relationData = createRelationAssertions(anchored);
  const conceptData = createConceptDeclarations(anchored);
  const links = extractWikilinks(tree, bodyStart, sections, text, {
    headings: headings.filter((heading) => !heading.quoted),
    status: metadata.value.status,
  });

  return {
    document: {
      id: `document:${repoId}:${path}`,
      type: 'Document',
      label: headings.find((heading) => heading.depth === 1)?.label ?? documentLabel(path),
      aliases: metadata.value.aliases,
      tags: metadata.value.tags,
      category: metadata.value.category,
      status: metadata.value.status,
      verified_at: metadata.value.verified_at,
      source_uri: path,
      source_revision: revision,
      content_hash: hash(source),
      source_updated_at: updatedAt,
    },
    units: [...sections, ...relationData.units, ...conceptData.units],
    links,
    assertions: relationData.assertions,
    concepts: conceptData.concepts,
    coverage_gaps: [...metadata.gaps, ...relationData.gaps, ...conceptData.gaps],
  };
}

function readFrontmatter(text) {
  const opening = /^(?:\uFEFF)?---[\t ]*\r?\n/.exec(text);
  if (!opening) return { raw: null, value: null, start: 0, end: 0, errors: [] };

  const closing = /^(?:---|\.\.\.)[\t ]*\r?$/m;
  closing.lastIndex = opening[0].length;
  const remainder = text.slice(opening[0].length);
  const match = closing.exec(remainder);
  if (!match) {
    return {
      raw: text.slice(opening[0].length),
      value: null,
      start: opening[0].length,
      end: 0,
      errors: ['Frontmatter closing delimiter is missing.'],
    };
  }

  const closeStart = opening[0].length + match.index;
  const closeEnd = closeStart + match[0].length;
  const newline = /^\r?\n/.exec(text.slice(closeEnd));
  const end = closeEnd + (newline?.[0].length ?? 0);
  const raw = text.slice(opening[0].length, closeStart);
  const document = parseDocument(raw, { prettyErrors: false });
  const errors = document.errors.map((error) => error.message);
  // An alias to a missing anchor and an alias bomb parse without errors, but toJS() throws on them.
  if (errors.length === 0) {
    try { document.toJS(); } catch (error) { errors.push(error.message); }
  }

  return { raw, value: document, start: opening[0].length, end, errors };
}

function readMetadata(frontmatter, path) {
  const gaps = frontmatter.errors.map((message) => coverageGap(path, 'MalformedFrontmatter', message));
  if (!frontmatter.value || frontmatter.errors.length > 0) {
    return { value: emptyMetadata(), gaps };
  }

  const value = frontmatter.value.toJS();
  if (!isPlainObject(value)) {
    gaps.push(coverageGap(path, 'MalformedFrontmatter', 'Frontmatter must be a YAML mapping.'));
    return { value: emptyMetadata(), gaps };
  }

  const metadata = emptyMetadata();
  for (const field of ['aliases', 'tags']) {
    if (value[field] === undefined) continue;
    if (!Array.isArray(value[field]) || !value[field].every((item) => typeof item === 'string')) {
      gaps.push(coverageGap(path, 'InvalidFrontmatterField', `${field} must be an array of strings.`));
      continue;
    }
    metadata[field] = value[field];
  }
  for (const field of ['category', 'status', 'verified_at']) {
    if (value[field] === undefined || value[field] === null) continue;
    if (typeof value[field] !== 'string') {
      gaps.push(coverageGap(path, 'InvalidFrontmatterField', `${field} must be a string.`));
      continue;
    }
    metadata[field] = value[field];
  }
  if (value.type !== undefined && typeof value.type !== 'string') {
    gaps.push(coverageGap(path, 'InvalidFrontmatterField', 'type must be a string.'));
  }
  return { value: metadata, gaps };
}

function createSections({ headings, path, repoId, revision, updatedAt, source, text }) {
  const byteOffset = createByteOffset(text);
  const lineStarts = createLineStarts(source);
  const entries = [{ headingPath: [], occurrence: 1, start: 0 }];
  const pathOccurrences = new Map();
  const stack = [];

  for (const heading of headings) {
    while (stack.length && stack.at(-1).depth >= heading.depth) stack.pop();
    const headingPath = [...stack.map((item) => item.label), heading.label];
    const pathKey = JSON.stringify(headingPath);
    const occurrence = (pathOccurrences.get(pathKey) ?? 0) + 1;
    pathOccurrences.set(pathKey, occurrence);
    entries.push({ headingPath, occurrence, start: byteOffset(heading.start) });
    stack.push({ depth: heading.depth, label: heading.label });
  }

  return entries.map((entry, index) => {
    const end = entries[index + 1]?.start ?? source.length;
    return section({
      id: `unit:${repoId}:${path}:${entry.headingPath.map((heading) => encodeURIComponent(heading) || '%').join('/')}#${entry.occurrence}`,
      label: entry.headingPath.at(-1) ?? documentLabel(path),
      headingPath: entry.headingPath,
      occurrence: entry.occurrence,
      start: entry.start,
      end,
      path,
      revision,
      updatedAt,
      source,
      lineStarts,
    });
  });
}

// Reads one frontmatter list whose items become byte-anchored evidence units.
// YAML aliases are refused because an item's anchor would omit the aliased text.
function frontmatterItems({ frontmatter, path, text }, field, { listGap, aliasGap, anchor }, gaps) {
  if (!frontmatter.value || frontmatter.errors.length > 0) return [];
  const value = frontmatter.value.toJS();
  if (!isPlainObject(value) || value[field] === undefined) return [];
  if (!Array.isArray(value[field])) {
    gaps.push(coverageGap(path, listGap, `${field} must be an array.`));
    return [];
  }
  const node = mapValueNode(frontmatter.value, field);
  let hasAlias = false;
  visitYaml(node, { Alias: () => { hasAlias = true; } });
  if (hasAlias) {
    gaps.push(coverageGap(path, aliasGap, `${field} must contain literal values within each ${anchor} anchor.`));
    return [];
  }
  const byteOffset = createByteOffset(text);
  return value[field].map((item, index) => {
    const [startChar, endChar] = node?.items?.[index]?.range ?? [frontmatter.start, frontmatter.start];
    return { item, index, start: byteOffset(frontmatter.start + startChar), end: byteOffset(frontmatter.start + endChar) };
  });
}

function frontmatterUnit({ path, revision, updatedAt, source }, lineStarts, { id, type, label, field, index, start, end }) {
  return section({ id, type, label, headingPath: ['frontmatter', field, String(index)], occurrence: 1,
    start, end, path, revision, updatedAt, source, lineStarts });
}

function createRelationAssertions(anchored) {
  const { path, repoId, source } = anchored;
  const gaps = [];
  const units = [];
  const assertions = [];
  const items = frontmatterItems(anchored, 'ontology_relations',
    { listGap: 'InvalidOntologyRelations', aliasGap: 'UnsupportedOntologyAlias', anchor: 'assertion' }, gaps);
  const lineStarts = items.length > 0 ? createLineStarts(source) : [];
  for (const { item: relation, index, start, end } of items) {
    if (!isPlainObject(relation)) {
      gaps.push(coverageGap(path, 'InvalidOntologyRelation', `ontology_relations[${index}] must be a mapping.`));
      continue;
    }
    const id = `unit:${repoId}:${path}:frontmatter.ontology_relations[${index}]`;
    const [subject, predicate, target, evidence] = RELATION_FIELDS
      .map((field) => stringField(relation, field, path, index, gaps));
    const unknownFields = Object.keys(relation).filter((field) => !RELATION_FIELDS.includes(field));
    const invalidFields = RELATION_FIELDS.some(
      (field) => relation[field] !== undefined && typeof relation[field] !== 'string',
    );

    if (unknownFields.length > 0) {
      gaps.push(coverageGap(path, 'UnverifiedOntologyRelation', `ontology_relations[${index}] has unsupported fields: ${unknownFields.join(', ')}.`));
      continue;
    }
    if (invalidFields) continue;
    if (!predicate?.trim() || !target?.trim()) {
      gaps.push(coverageGap(path, 'InvalidOntologyRelation', `ontology_relations[${index}] requires non-empty predicate and target.`));
      continue;
    }
    if (!ASSERTION_PREDICATES.includes(predicate)) {
      gaps.push(coverageGap(path, 'UnsupportedOntologyPredicate', `ontology_relations[${index}] has unsupported predicate: ${predicate}.`));
      continue;
    }
    units.push(frontmatterUnit(anchored, lineStarts, { id, type: 'RelationAssertion',
      label: [subject, predicate, target].filter(Boolean).join(' ') || `ontology_relations[${index}]`,
      field: 'ontology_relations', index, start, end }));
    assertions.push(compact({ subject, predicate, target, evidence, evidence_unit_id: id, assertion_occurrence: 1 }));
  }
  return { gaps, units, assertions };
}

// Concept declarations follow the relation policy: an invalid item is a gap and
// never becomes a unit. Graph validation decides whether a valid one becomes a Concept.
function createConceptDeclarations(anchored) {
  const { path, repoId, source } = anchored;
  const gaps = [];
  const units = [];
  const concepts = [];
  const items = frontmatterItems(anchored, 'ontology_concepts',
    { listGap: 'invalid_concept_declaration', aliasGap: 'invalid_concept_declaration', anchor: 'declaration' }, gaps);
  const lineStarts = items.length > 0 ? createLineStarts(source) : [];
  for (const { item, index, start, end } of items) {
    const [reason, problem] = conceptProblem(item);
    if (reason) {
      gaps.push(coverageGap(path, reason, `ontology_concepts[${index}] ${problem}`));
      continue;
    }
    const id = `unit:${repoId}:${path}:frontmatter.ontology_concepts[${index}]`;
    units.push(frontmatterUnit(anchored, lineStarts, { id, type: 'ConceptDeclaration', label: item.label,
      field: 'ontology_concepts', index, start, end }));
    concepts.push(compact({ id: `concept:${repoId}:${item.id}`, type: item.type, label: item.label,
      aliases: item.aliases ?? [], evidence: item.evidence, broader: item.broader, evidence_unit_id: id }));
  }
  return { gaps, units, concepts };
}

function conceptProblem(item) {
  const invalid = (problem) => ['invalid_concept_declaration', problem];
  if (!isPlainObject(item)) return invalid('must be a mapping.');
  const unknownFields = Object.keys(item).filter((field) => !CONCEPT_FIELDS.includes(field));
  if (unknownFields.length > 0) return invalid(`has unsupported fields: ${unknownFields.join(', ')}.`);
  if (typeof item.id !== 'string' || !CONCEPT_SLUG.test(item.id)) return invalid(`id must match ${CONCEPT_SLUG.source}.`);
  if (typeof item.type !== 'string') return invalid('type must be a string.');
  if (!CONCEPT_TYPES.includes(item.type)) return ['unsupported_concept_type', `has unsupported type: ${item.type}.`];
  if (typeof item.label !== 'string' || !item.label.trim()) return invalid('label must be a non-empty string.');
  if (item.aliases !== undefined && (!Array.isArray(item.aliases)
    || !item.aliases.every((alias) => typeof alias === 'string' && alias.trim()))) {
    return invalid('aliases must be an array of non-empty strings.');
  }
  if (item.evidence !== undefined && typeof item.evidence !== 'string') return invalid('evidence must be a string.');
  if (item.broader !== undefined && (typeof item.broader !== 'string' || !CONCEPT_SLUG.test(item.broader))) {
    return invalid('broader must be a concept slug.');
  }
  return [];
}

function findHeadings(tree, bodyStart) {
  const headings = [];
  const walk = (node, quoted = false) => {
    if (node.type === 'heading') {
      headings.push({
        depth: node.depth,
        label: inlineText(node).replace(/\s+/g, ' ').trim(),
        start: bodyStart + node.position.start.offset,
        quoted,
      });
    }
    for (const child of node.children ?? []) walk(child, quoted || node.type === 'blockquote');
  };
  walk(tree);
  return headings;
}

function extractWikilinks(tree, bodyStart, sections, text, { headings, status }) {
  const byteOffset = createByteOffset(text);
  const { excluded, quoted } = findExcludedRanges(tree, bodyStart);
  const occurrences = new Map();
  const links = [];
  const source = text.slice(bodyStart);
  for (const match of source.matchAll(WIKILINK_PATTERN)) {
    const startChar = bodyStart + match.index;
    let slashes = 0;
    for (let index = startChar - 1; index >= 0 && text[index] === '\\'; index -= 1) slashes += 1;
    if (slashes % 2 === 1) continue;
    if (excluded.some((range) => range.start <= startChar && startChar < range.end)) continue;
    const unit = sections.find((section) => {
      const offset = byteOffset(startChar);
      return section.anchor.start_byte <= offset && offset < section.anchor.end_byte;
    });
    if (!unit) continue;
    const target = match[1].trim();
    if (!target) continue;
    const occurrence = (occurrences.get(unit.id) ?? 0) + 1;
    occurrences.set(unit.id, occurrence);
    links.push(compact({
      target,
      link_role: classifyLinkRole({ target, status, headings, text, startChar,
        quoted: quoted.some((range) => range.start <= startChar && startChar < range.end) }),
      evidence_unit_id: unit.id,
      assertion_occurrence: occurrence,
    }));
  }
  return links;
}

function classifyLinkRole({ target, status, headings, text, startChar, quoted }) {
  if (target.startsWith('#')) return undefined;
  if (PARENT_INDEX_PREFIX.test(lineBefore(text, startChar))) return 'parent_index';
  if (quoted) return undefined;
  const active = activeHeadings(headings, startChar);
  if (active.some((heading) => RELATED_DOCUMENT_HEADINGS.has(heading.label))) return 'related_document';
  if (status === 'index' && active.some((heading) => isIndexMemberHeading(heading.label))) return 'index_member';
  return undefined;
}

function isIndexMemberHeading(heading) {
  return INDEX_MEMBER_HEADINGS.has(heading) || /^하위 폴더 인덱스 \(\d+개\)$/.test(heading)
    || /^목차 \([^()\r\n]+\)$/.test(heading);
}

function activeHeadings(headings, offset) {
  const active = [];
  for (const heading of headings) {
    if (heading.start > offset) break;
    while (active.length && active.at(-1).depth >= heading.depth) active.pop();
    active.push(heading);
  }
  return active;
}

function lineBefore(text, offset) {
  return text.slice(Math.max(text.lastIndexOf('\n', offset - 1), text.lastIndexOf('\r', offset - 1)) + 1, offset);
}

function findExcludedRanges(tree, bodyStart) {
  const excluded = [];
  const quoted = [];
  visit(tree, (node) => {
    if (!node.position) return;
    const range = { start: bodyStart + node.position.start.offset, end: bodyStart + node.position.end.offset };
    if (node.type === 'blockquote') quoted.push(range);
    if (['code', 'html', 'inlineCode', 'link', 'image', 'definition', 'linkReference', 'imageReference'].includes(node.type)) {
      excluded.push(range);
    }
  });
  return { excluded, quoted };
}

function section({ id, type = 'Section', label, headingPath, occurrence, start, end, path, revision, updatedAt, source, lineStarts }) {
  return {
    id,
    type,
    label,
    source_uri: path,
    source_revision: revision,
    content_hash: hash(source.subarray(start, end)),
    source_updated_at: updatedAt,
    anchor: {
      heading_path: headingPath,
      occurrence,
      start_line: lineNumber(lineStarts, start),
      end_line: lineNumber(lineStarts, Math.max(start, end - 1)),
      start_byte: start,
      end_byte: end,
    },
  };
}

function inlineText(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  if (node.type === 'break') return ' ';
  return (node.children ?? []).map((child) => inlineText(child)).join('');
}

function visit(node, callback) {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}

function createByteOffset(text) {
  const offsets = new Map();
  return (characterOffset) => {
    if (!offsets.has(characterOffset)) offsets.set(characterOffset, Buffer.byteLength(text.slice(0, characterOffset)));
    return offsets.get(characterOffset);
  };
}

function createLineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === 10) starts.push(index + 1);
    else if (source[index] === 13 && source[index + 1] !== 10) starts.push(index + 1);
  }
  return starts;
}

function lineNumber(starts, byteOffset) {
  let low = 0;
  let high = starts.length;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] <= byteOffset) low = middle;
    else high = middle;
  }
  return low + 1;
}

function mapValueNode(document, key) {
  const pair = document.contents?.items?.find((item) => item.key?.value === key);
  return pair?.value;
}

function stringField(value, field, path, index, gaps) {
  if (value[field] === undefined) return undefined;
  if (typeof value[field] === 'string') return value[field];
  gaps.push(coverageGap(path, 'InvalidOntologyRelation', `ontology_relations[${index}].${field} must be a string.`));
  return undefined;
}

function emptyMetadata() {
  return { aliases: [], tags: [], category: null, status: null, verified_at: null };
}

function coverageGap(path, type, message) {
  return { type, source_uri: path, message };
}

function documentLabel(path) {
  return path.split('/').at(-1).replace(/\.md$/i, '');
}

function hash(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function compact(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
