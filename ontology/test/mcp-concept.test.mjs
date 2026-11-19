import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { parseArguments } from '../src/cli.mjs';
import { CONCEPT_FILES, cli, gitFixture } from './ontology-fixture.mjs';

async function connect(t, item) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli, 'serve', '--repo', item.repo, '--cache', item.cacheDir],
    stderr: 'pipe',
  });
  const client = new Client({ name: 'context-concept-test', version: '0.1.0' });
  await client.connect(transport);
  t.after(() => transport.close());
  return client;
}

const call = (client, args) => client.request({ method: 'tools/call',
  params: { name: 'context_concept', arguments: args } }, CallToolResultSchema);

test('MCP context_concept is read-only, strict and returns the same payload as the CLI', async (t) => {
  const item = gitFixture(t, CONCEPT_FILES);
  const client = await connect(t, item);
  const listed = await client.request({ method: 'tools/list', params: {} }, ListToolsResultSchema);
  const tool = listed.tools.find((entry) => entry.name === 'context_concept');
  assert.equal(tool.annotations.readOnlyHint, true);
  assert.equal(tool.annotations.destructiveHint, false);
  assert.equal(tool.inputSchema.additionalProperties, false);
  assert.deepEqual(Object.keys(tool.inputSchema.properties).sort(),
    ['concept', 'depth', 'include_inferred', 'max_bytes', 'predicates', 'types']);
  assert.match(tool.description, /inferred true/);
  assert.match(listed.tools.find((entry) => entry.name === 'context_lookup').description, /context_concept/);

  const args = { concept: '이중 쓰기 문제', predicates: ['addressed_by'], depth: 2, max_bytes: 12000 };
  const result = await call(client, args);
  assert.equal(result.isError, undefined);
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  assert.equal(result.structuredContent.result_status, 'ok');
  assert.deepEqual(result.structuredContent.relations.map((relation) => [relation.predicate, relation.peer.label,
    relation.inferred, relation.rule]), [['addressed_by', 'Transactional Outbox', true, 'inverse']]);
  const fromCli = JSON.parse(execFileSync(process.execPath, [cli, 'concept', args.concept, '--repo', item.repo,
    '--cache', item.cacheDir, '--predicate', 'addressed_by', '--depth', '2', '--max-bytes', '12000'], { encoding: 'utf8' }));
  assert.deepEqual(fromCli, result.structuredContent);

  for (const bad of [{ concept: 'x', repo: '/elsewhere' }, { concept: 'x', depth: 4 }, { concept: ' ' },
    { concept: 'x', predicates: ['unknown'] }]) {
    const rejected = await call(client, bad);
    assert.equal(rejected.isError, true, JSON.stringify(bad));
  }
  assert.equal((await call(client, { concept: 'nothing here' })).structuredContent.result_status, 'concept_not_found');
});

test('the concept CLI takes a positional term and rejects options of other commands', () => {
  const parsed = parseArguments(['concept', 'Outbox', '--predicate', 'addresses', '--type', 'Problem', '--depth', '3',
    '--no-inferred']);
  assert.deepEqual([parsed.concept, parsed.predicates, parsed.types, parsed.depth, parsed.includeInferred],
    ['Outbox', ['addresses'], ['Problem'], 3, false]);
  for (const argv of [['concept'], ['concept', 'x', '--scope', 'tech'], ['lookup', '--query', 'q', '--depth', '3'],
    ['lookup', '--query', 'q', '--predicate', 'addresses'], ['search', '--query', 'q', '--staged'],
    ['candidates'], ['validate', '--check', 'x.jsonl'], ['concept', 'x', '--depth', '4']]) {
    assert.throws(() => parseArguments(argv), (error) => error.code === 'invalid_arguments', argv.join(' '));
  }
});
