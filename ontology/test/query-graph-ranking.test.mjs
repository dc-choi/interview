import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { lookup } from '../src/query.mjs';
import { buildSnapshot, loadSnapshot } from '../src/snapshot.mjs';

const FIXTURE_GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
  GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
};

function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env: FIXTURE_GIT_ENV });
}

function graphFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'context-query-graph-ranking-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  git(root, ['init', '-q', repo]);
  git(repo, ['config', 'user.name', 'Test User']);
  git(repo, ['config', 'user.email', 'test@example.com']);

  const routeLinks = Array.from({ length: 55 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const name = `Focus-${number}`;
    const path = `tech/${name}.md`;
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), `# ${name}\n\nDependency entry.\n`);
    return `## Route ${number}\n\nneedle-${number} route explicitly explains [[${name}]].\n`;
  });
  writeFileSync(join(repo, 'tech', 'Body-Match.md'), `# Body Match\n\n${routeLinks
    .map((_, index) => `needle-${String(index + 1).padStart(2, '0')}`).join(' ')}\n`);
  writeFileSync(join(repo, 'tech', 'Needle-Protocol.md'), [
    '# Needle Protocol',
    '',
    '## Directory body',
    '',
    'Archive pointer [[Body-Match]].',
    '',
    ...routeLinks,
  ].join('\n'));
  git(repo, ['add', 'tech']);
  git(repo, ['commit', '-qm', 'fixture']);
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { repo, cacheDir };
}

test('graph traversal spends its incident-edge cap on query-backed link evidence first', (t) => {
  const { repo, cacheDir } = graphFixture(t);
  const snapshot = loadSnapshot({ repo, cacheDir });
  const root = snapshot.entities.find((entity) => entity.type === 'Document'
    && entity.source_uri === 'tech/Needle-Protocol.md');
  assert.ok(root);

  const sectionsById = new Map(snapshot.entities.map((entity) => [entity.id, entity]));
  const incident = snapshot.relations
    .filter((relation) => relation.subject === root.id && relation.predicate === 'links_to')
    .sort((left, right) => left.id.localeCompare(right.id));
  const routes = incident.filter((relation) => sectionsById.get(relation.evidence_unit_id)?.label.startsWith('Route '));
  const focused = routes.at(-1);
  assert.ok(focused);
  assert.equal(incident.length, 56);
  assert.ok(incident.indexOf(focused) >= 50,
    `the legacy ID-only order would exclude this query-backed edge at the 50-edge cap (rank ${incident.indexOf(focused)})`);
  const routeNumber = sectionsById.get(focused.evidence_unit_id).label.slice('Route '.length);
  const query = `needle-${routeNumber}`;

  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query, scope: ['tech'], depth: 1, max_bytes: 24 * 1024,
  });
  const relation = result.relations.find((entry) => entry.id === focused.id);
  assert.ok(relation, 'the query-backed relation survives graph selection and output budgeting');
  assert.equal(relation.subject, root.id);
  assert.equal(relation.evidence_unit_id, focused.evidence_unit_id);
  const evidence = result.evidence_units.find((entry) => entry.id === focused.evidence_unit_id);
  assert.ok(evidence);
  assert.equal(evidence.source_revision, snapshot.manifest.revision);
  assert.ok(evidence.excerpt.includes(`${query} route explicitly explains`));
  const entityIds = new Set(result.entities.map((entity) => entity.id));
  assert.ok(entityIds.has(root.id));
  assert.ok(entityIds.has(focused.object));
  assert.equal(Buffer.byteLength(JSON.stringify(result), 'utf8'), result.budget.used_bytes);
  assert.ok(result.budget.used_bytes <= 24 * 1024);
});

test('an exact one-token document title still ranks an incident link by its body evidence', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'context-query-graph-exact-title-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  git(root, ['init', '-q', repo]);
  git(repo, ['config', 'user.name', 'Test User']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  mkdirSync(join(repo, 'tech'), { recursive: true });

  const noiseLinks = Array.from({ length: 55 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const name = `Noise-${number}`;
    writeFileSync(join(repo, 'tech', `${name}.md`), `# ${name}\n\nUnrelated archive entry.\n`);
    return `## Directory ${number}\n\nArchive pointer [[${name}]].\n`;
  });
  writeFileSync(join(repo, 'tech', 'Relevant-Target-B.md'), '# Relevant Target\n\nRequired dependency.\n');
  writeFileSync(join(repo, 'tech', 'Needle.md'), [
    '# Needle',
    '',
    '## Evidence',
    '',
    'The needle body explains [[Relevant-Target-B]].',
    '',
    ...noiseLinks,
  ].join('\n'));
  git(repo, ['add', 'tech']);
  git(repo, ['commit', '-qm', 'fixture']);
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const snapshot = loadSnapshot({ repo, cacheDir });
  const needle = snapshot.entities.find((entity) => entity.type === 'Document' && entity.source_uri === 'tech/Needle.md');
  const target = snapshot.entities.find((entity) => entity.type === 'Document' && entity.source_uri === 'tech/Relevant-Target-B.md');
  assert.ok(needle);
  assert.ok(target);
  const incident = snapshot.relations
    .filter((relation) => relation.subject === needle.id && relation.predicate === 'links_to')
    .sort((left, right) => left.id.localeCompare(right.id));
  const relevant = incident.find((relation) => relation.object === target.id);
  assert.ok(relevant);
  assert.equal(incident.length, 56);
  assert.ok(incident.indexOf(relevant) >= 50,
    `the legacy exact-title path would exclude the body-backed edge at the 50-edge cap (rank ${incident.indexOf(relevant)})`);

  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'Needle', scope: ['tech'], depth: 1, max_bytes: 24 * 1024,
  });
  const relation = result.relations.find((entry) => entry.id === relevant.id);
  assert.ok(relation, 'the exact-title query keeps the linked body evidence');
  assert.equal(relation.evidence_unit_id, relevant.evidence_unit_id);
  assert.equal(relation.subject, needle.id);
  assert.equal(relation.object, target.id);
  const evidence = result.evidence_units.find((entry) => entry.id === relevant.evidence_unit_id);
  assert.ok(evidence);
  assert.equal(evidence.source_revision, snapshot.manifest.revision);
  assert.ok(evidence.excerpt.includes('needle body explains'));
  assert.equal(Buffer.byteLength(JSON.stringify(result), 'utf8'), result.budget.used_bytes);
  assert.ok(result.budget.used_bytes <= 24 * 1024);
});

test('typed relation assertion metadata outranks generic linked sections', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'context-query-graph-assertion-'));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  git(root, ['init', '-q', repo]);
  git(repo, ['config', 'user.name', 'Test User']);
  git(repo, ['config', 'user.email', 'test@example.com']);
  mkdirSync(join(repo, 'tech'), { recursive: true });

  const noiseLinks = Array.from({ length: 50 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const name = `Noise-${number}`;
    writeFileSync(join(repo, 'tech', `${name}.md`), `# ${name}\n\nUnrelated archive entry.\n`);
    return `## Directory ${number}\n\nArchive pointer [[${name}]].\n`;
  });
  writeFileSync(join(repo, 'tech', 'Target-A.md'), '# Target\n\nUnrelated dependency.\n');
  const body = ['# Needle', '', ...noiseLinks].join('\n');
  writeFileSync(join(repo, 'tech', 'Needle.md'), body);
  git(repo, ['add', 'tech']);
  git(repo, ['commit', '-qm', 'initial fixture']);
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });

  const initial = loadSnapshot({ repo, cacheDir });
  const needle = initial.entities.find((entity) => entity.type === 'Document' && entity.source_uri === 'tech/Needle.md');
  const target = initial.entities.find((entity) => entity.type === 'Document' && entity.source_uri === 'tech/Target-A.md');
  assert.ok(needle);
  assert.ok(target);
  writeFileSync(join(repo, 'tech', 'Needle.md'), [
    '---',
    'ontology_relations:',
    `  - subject: '${needle.id}'`,
    '    predicate: supported_by',
    `    target: '${target.id}'`,
    '---',
    body,
  ].join('\n'));
  git(repo, ['add', 'tech/Needle.md']);
  git(repo, ['commit', '-qm', 'add typed assertion']);
  buildSnapshot({ repo, cacheDir, scopes: ['tech'] });
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const snapshot = loadSnapshot({ repo, cacheDir });
  const assertion = snapshot.entities.find((entity) => entity.type === 'RelationAssertion'
    && entity.source_uri === 'tech/Needle.md');
  const typed = snapshot.relations.find((relation) => relation.subject === needle.id
    && relation.predicate === 'supported_by' && relation.object === target.id);
  assert.ok(assertion);
  assert.ok(typed);
  assert.equal(typed.evidence_unit_id, assertion.id);
  const genericLinks = snapshot.relations.filter((relation) => relation.subject === needle.id
    && relation.predicate === 'links_to');
  assert.equal(genericLinks.length, 50);

  const result = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'Needle supported_by', scope: ['tech'], depth: 1, max_bytes: 24 * 1024,
  });
  const relation = result.relations.find((entry) => entry.id === typed.id);
  assert.ok(relation, 'the typed assertion survives the incident-edge cap');
  assert.equal(relation.evidence_unit_id, assertion.id);
  assert.equal(relation.subject, needle.id);
  assert.equal(relation.object, target.id);
  const evidence = result.evidence_units.find((entry) => entry.id === assertion.id);
  assert.ok(evidence);
  assert.equal(evidence.source_revision, snapshot.manifest.revision);
  assert.ok(evidence.excerpt.includes('predicate: supported_by'));
  const exactTitleResult = lookup({ repo, cacheDir, allowlist: ['tech'] }, {
    query: 'Needle', scope: ['tech'], depth: 1, max_bytes: 24 * 1024,
  });
  assert.ok(exactTitleResult.relations.some((entry) => entry.id === typed.id),
    'the exact title also retains the typed assertion metadata score');
  assert.equal(Buffer.byteLength(JSON.stringify(result), 'utf8'), result.budget.used_bytes);
  assert.ok(result.budget.used_bytes <= 24 * 1024);
});
