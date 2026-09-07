import { createHash } from 'node:crypto';
import { isUtf8 } from 'node:buffer';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { parseDocument, visit as visitYaml } from 'yaml';
import { ASSERTION_PREDICATES, ContextError } from './core.mjs';

const WIKILINK_PATTERN = /\[\[([^\]|\r\n]+?)(?:\\?\|[^\]\r\n]*)?\]\]/g;

export function normalizeHeading(text) {
  const tree = fromMarkdown(`# ${text.replace(/[\r\n]+/g, ' ')}`);
  const value = tree.children.map((node) => inlineText(node)).join('');
  return value.replace(/\s+/g, ' ').trim();
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
  const relationData = createRelationAssertions({
    frontmatter,
    path,
    repoId,
    revision,
    updatedAt,
    source,
    text,
  });
  const links = extractWikilinks(tree, bodyStart, sections, text);

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
    units: [...sections, ...relationData.units],
    links,
    assertions: relationData.assertions,
    coverage_gaps: [...metadata.gaps, ...relationData.gaps],
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

  return { raw, value: document, start: opening[0].length, end, errors: document.errors.map((error) => error.message) };
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

function createRelationAssertions({ frontmatter, path, repoId, revision, updatedAt, source, text }) {
  const gaps = [];
  const units = [];
  const assertions = [];
  if (!frontmatter.value || frontmatter.errors.length > 0) return { gaps, units, assertions };

  const frontmatterValue = frontmatter.value.toJS();
  if (!isPlainObject(frontmatterValue)) return { gaps, units, assertions };

  const relations = frontmatterValue.ontology_relations;
  if (relations === undefined) return { gaps, units, assertions };
  if (!Array.isArray(relations)) {
    gaps.push(coverageGap(path, 'InvalidOntologyRelations', 'ontology_relations must be an array.'));
    return { gaps, units, assertions };
  }

  const relationNode = mapValueNode(frontmatter.value, 'ontology_relations');
  let hasAlias = false;
  visitYaml(relationNode, { Alias: () => { hasAlias = true; } });
  if (hasAlias) {
    gaps.push(coverageGap(path, 'UnsupportedOntologyAlias', 'ontology_relations must contain literal values within each assertion anchor.'));
    return { gaps, units, assertions };
  }
  const itemNodes = relationNode?.items ?? [];
  const byteOffset = createByteOffset(text);
  const lineStarts = createLineStarts(source);
  relations.forEach((relation, index) => {
    if (!isPlainObject(relation)) {
      gaps.push(coverageGap(path, 'InvalidOntologyRelation', `ontology_relations[${index}] must be a mapping.`));
      return;
    }
    const node = itemNodes[index];
    const [startChar, endChar] = node?.range ?? [frontmatter.start, frontmatter.start];
    const start = byteOffset(frontmatter.start + startChar);
    const end = byteOffset(frontmatter.start + endChar);
    const id = `unit:${repoId}:${path}:frontmatter.ontology_relations[${index}]`;
    const subject = stringField(relation, 'subject', path, index, gaps);
    const predicate = stringField(relation, 'predicate', path, index, gaps);
    const target = stringField(relation, 'target', path, index, gaps);
    const unknownFields = Object.keys(relation).filter((field) => !['subject', 'predicate', 'target'].includes(field));
    const invalidFields = ['subject', 'predicate', 'target'].some(
      (field) => relation[field] !== undefined && typeof relation[field] !== 'string',
    );

    if (unknownFields.length > 0) {
      gaps.push(coverageGap(path, 'UnverifiedOntologyRelation', `ontology_relations[${index}] has unsupported fields: ${unknownFields.join(', ')}.`));
      return;
    }
    if (invalidFields) return;
    if (!predicate?.trim() || !target?.trim()) {
      gaps.push(coverageGap(path, 'InvalidOntologyRelation', `ontology_relations[${index}] requires non-empty predicate and target.`));
      return;
    }
    if (!ASSERTION_PREDICATES.includes(predicate)) {
      gaps.push(coverageGap(path, 'UnsupportedOntologyPredicate', `ontology_relations[${index}] has unsupported predicate: ${predicate}.`));
      return;
    }
    units.push(section({
      id,
      type: 'RelationAssertion',
      label: [subject, predicate, target].filter(Boolean).join(' ') || `ontology_relations[${index}]`,
      headingPath: ['frontmatter', 'ontology_relations', String(index)],
      occurrence: 1,
      start,
      end,
      path,
      revision,
      updatedAt,
      source,
      lineStarts,
    }));
    assertions.push(compact({ subject, predicate, target, evidence_unit_id: id, assertion_occurrence: 1 }));
  });
  return { gaps, units, assertions };
}

function findHeadings(tree, bodyStart) {
  const headings = [];
  visit(tree, (node) => {
    if (node.type !== 'heading') return;
    headings.push({
      depth: node.depth,
      label: inlineText(node).replace(/\s+/g, ' ').trim(),
      start: bodyStart + node.position.start.offset,
    });
  });
  return headings;
}

function extractWikilinks(tree, bodyStart, sections, text) {
  const byteOffset = createByteOffset(text);
  const excluded = findExcludedRanges(tree, bodyStart);
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
    links.push({ target, evidence_unit_id: unit.id, assertion_occurrence: occurrence });
  }
  return links;
}

function findExcludedRanges(tree, bodyStart) {
  const ranges = [];
  visit(tree, (node) => {
    if (!['code', 'html', 'inlineCode', 'link', 'image', 'definition', 'linkReference', 'imageReference'].includes(node.type)
      || !node.position) return;
    ranges.push({
      start: bodyStart + node.position.start.offset,
      end: bodyStart + node.position.end.offset,
    });
  });
  return ranges;
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
