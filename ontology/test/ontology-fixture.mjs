import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));

// A typed concept fixture: a vocabulary file plus one knowledge document whose
// frontmatter declares concepts and relations backed by its own sections.
export const CONCEPT_FILES = {
  'ontology/vocabulary/Vocabulary-Messaging.md': [
    '---',
    'tags: [ontology, vocabulary]',
    'status: vocabulary',
    'category: Ontology',
    'ontology_concepts:',
    '  - {id: messaging, type: Topic, label: Messaging, aliases: [메시징]}',
    '  - {id: messaging-reliability, type: Topic, label: Messaging Reliability, broader: messaging}',
    '  - {id: delivery-guarantee, type: Topic, label: Delivery Guarantee, broader: messaging-reliability}',
    '  - {id: tech-category, type: Category, label: Tech, aliases: [Technology]}',
    '  - {id: ontology-category, type: Category, label: Ontology}',
    '---',
    '# Messaging vocabulary',
    '',
    'Transactional outbox appears here only as vocabulary text.',
    '',
  ].join('\n'),
  'tech/Outbox.md': [
    '---',
    'tags: [Messaging, messaging-reliability, unmapped tag]',
    'category: tech',
    'ontology_concepts:',
    '  - id: transactional-outbox',
    '    type: Approach',
    '    label: Transactional Outbox',
    '    aliases: ["아웃박스 패턴", Outbox]',
    '    evidence: "[[#해결: Outbox 테이블]]"',
    '    broader: delivery-guarantee',
    '  - {id: dual-write-problem, type: Problem, label: Dual Write Problem, aliases: [이중 쓰기 문제], evidence: "[[#문제]]"}',
    '  - {id: cdc-relay, type: Approach, label: CDC Relay, evidence: "[[#대안]]"}',
    '  - {id: relay-lag, type: Tradeoff, label: Relay Lag, evidence: "[[#비용]]"}',
    'ontology_relations:',
    '  - subject: concept:transactional-outbox',
    '    predicate: addresses',
    '    target: concept:dual-write-problem',
    '    evidence: "[[#해결: Outbox 테이블]]"',
    '  - {subject: "concept:cdc-relay", predicate: alternative_to, target: "concept:transactional-outbox", evidence: "[[#대안]]"}',
    '  - {subject: "concept:transactional-outbox", predicate: has_tradeoff, target: "concept:relay-lag", evidence: "[[#비용]]"}',
    '  - {subject: "concept:relay-lag", predicate: contradicted_by, target: "[[#비용]]"}',
    '---',
    '# Transactional Outbox',
    '## 문제',
    'DB와 브로커에 따로 쓰면 하나만 성공할 수 있다.',
    '## 해결: Outbox 테이블',
    '같은 트랜잭션에 이벤트를 기록하고 릴레이가 발행한다.',
    '## 대안',
    'CDC로 커밋 로그를 읽어 발행한다.',
    '## 비용',
    '릴레이 지연만큼 발행이 늦어진다.',
    '',
  ].join('\n'),
  'tech/Relay.md': [
    '---',
    'tags: [delivery guarantee]',
    'category: Technology',
    'ontology_relations:',
    '  - {subject: "[[#Polling]]", predicate: mentions, target: "concept:transactional-outbox"}',
    '---',
    '# Relay',
    '## Polling',
    'The relay polls the outbox table and publishes each row.',
    '',
  ].join('\n'),
};

/** Creates a temporary Git repository with committed files; `date` pins commit hashes. */
export function gitFixture(t, files, { date } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'context-ontology-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, 'repo');
  const cacheDir = join(root, 'cache');
  mkdirSync(repo);
  const env = date ? { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : process.env;
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', env, stdio: 'pipe' }).trim();
  const write = (entries) => {
    for (const [path, text] of Object.entries(entries)) {
      mkdirSync(dirname(join(repo, path)), { recursive: true });
      writeFileSync(join(repo, path), text);
    }
  };
  const commit = (message = 'fixture') => {
    git('add', '.');
    git('-c', 'commit.gpgsign=false', 'commit', '-qm', message);
  };
  git('init', '-q');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  write(files);
  commit();
  return { root, repo, cacheDir, git, write, commit };
}
