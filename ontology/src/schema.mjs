// The ontology TBox: classes with single inheritance and predicates with domain,
// range and characteristics. Each snapshot's schema.json is generated from this
// module, and the parser, graph validation and concept queries read it directly.
export const SCHEMA_VERSION = '2';
export const EXTRACTOR_VERSION = '13';

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};

// evidence_required: a declaration of this class needs an `evidence` wikilink
// that resolves to exactly one Section, or it is not materialized.
export const CLASSES = deepFreeze([
  { name: 'Entity', abstract: true },
  { name: 'Document', subclass_of: 'Entity' },
  { name: 'EvidenceUnit', subclass_of: 'Entity', abstract: true },
  { name: 'Section', subclass_of: 'EvidenceUnit' },
  { name: 'RelationAssertion', subclass_of: 'EvidenceUnit' },
  { name: 'ConceptDeclaration', subclass_of: 'EvidenceUnit' },
  { name: 'Concept', subclass_of: 'Entity', abstract: true },
  { name: 'Topic', subclass_of: 'Concept' },
  { name: 'Category', subclass_of: 'Concept' },
  { name: 'Problem', subclass_of: 'Concept', evidence_required: true },
  { name: 'Approach', subclass_of: 'Concept', evidence_required: true },
  { name: 'Condition', subclass_of: 'Concept', evidence_required: true },
  { name: 'Tradeoff', subclass_of: 'Concept', evidence_required: true },
]);

const LEGACY = ['calls', 'publishes', 'consumes', 'reads_from', 'writes_to', 'constrained_by', 'verified_by'];

// authorable: allowed in frontmatter ontology_relations; the others are parser-derived.
// evidence_required: the assertion needs an `evidence` wikilink to exactly one Section.
export const PREDICATES = deepFreeze([
  { name: 'contains', domain: ['Document'], range: ['EvidenceUnit'], characteristics: [], authorable: false },
  { name: 'links_to', domain: ['Document'], range: ['Document', 'Section'], characteristics: [], authorable: false },
  { name: 'declares', domain: ['Document'], range: ['Concept'], characteristics: [], authorable: false },
  { name: 'tagged_with', domain: ['Document'], range: ['Concept'], characteristics: [], authorable: false },
  { name: 'in_category', domain: ['Document'], range: ['Category'], characteristics: [], authorable: false },
  { name: 'addresses', domain: ['Approach'], range: ['Problem'], characteristics: [], inverse: 'addressed_by',
    authorable: true, evidence_required: true },
  { name: 'requires', domain: ['Approach'], range: ['Condition'], characteristics: [], inverse: 'required_by',
    authorable: true, evidence_required: true },
  { name: 'has_tradeoff', domain: ['Approach'], range: ['Tradeoff'], characteristics: [], inverse: 'tradeoff_of',
    authorable: true, evidence_required: true },
  { name: 'alternative_to', domain: ['Approach'], range: ['Approach'], characteristics: ['symmetric', 'irreflexive'],
    authorable: true, evidence_required: true },
  { name: 'broader', domain: ['Concept'], range: ['Concept'], characteristics: ['transitive', 'irreflexive', 'acyclic'],
    inverse: 'narrower', authorable: true },
  { name: 'supported_by', domain: ['Concept', 'RelationAssertion'], range: ['Section'], characteristics: [], authorable: true },
  { name: 'contradicted_by', domain: ['Concept', 'RelationAssertion'], range: ['Section'], characteristics: [], authorable: true },
  { name: 'mentions', domain: ['Document', 'Section'], range: ['Concept'], characteristics: [], authorable: true },
  ...LEGACY.map((name) => ({ name, domain: ['Entity'], range: ['Entity'], characteristics: [], authorable: true, legacy: true })),
]);

const parents = new Map(CLASSES.map((item) => [item.name, item.subclass_of]));
export const CLASS_BY_NAME = new Map(CLASSES.map((item) => [item.name, item]));
export const PREDICATE_BY_NAME = new Map(PREDICATES.map((item) => [item.name, item]));

/** True when `type` is `ancestor` or one of its subclasses. */
export function isA(type, ancestor) {
  for (let current = type; current; current = parents.get(current)) if (current === ancestor) return true;
  return false;
}

export const CONCEPT_TYPES = Object.freeze(CLASSES.filter((item) => !item.abstract && isA(item.name, 'Concept'))
  .map((item) => item.name));

/** Domain and range use the class hierarchy, so a Problem satisfies range Concept. */
export const allowsSubject = (predicate, type) => predicate.domain.some((name) => isA(type, name));
export const allowsObject = (predicate, type) => predicate.range.some((name) => isA(type, name));
export const hasCharacteristic = (predicate, name) => predicate.characteristics.includes(name);
