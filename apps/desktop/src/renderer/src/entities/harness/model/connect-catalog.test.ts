import { expect, test } from 'vitest';

import type { ConnectClient } from './connect-facts';

import { everythingCopied, servingGateway } from '../testing/connect-facts.testkit';
import { clientNamed, clientsMatching, connectClients, connectGroups } from './connect-catalog';
import { addressFor } from './connect-facts';

function everySpellingOfTheAddress(client: ConnectClient): readonly string[] {
  return everythingCopied(client)
    .split(servingGateway.baseUrl)
    .slice(1)
    .map((rest) => (rest.startsWith('/v1') ? 'v1' : 'origin'));
}

test('every client is handed the gateway address spelled the way that client joins its paths', () => {
  for (const client of connectClients) {
    const spellings = everySpellingOfTheAddress(client);

    expect(spellings.length).toBeGreaterThan(0);

    if (client.reach !== 'whole') {
      expect(new Set(spellings)).toEqual(new Set([client.reach]));
      expect(everythingCopied(client)).toContain(addressFor(client.reach, servingGateway));
    }
  }
});

test('a gateway that enforces a key hands that key to every client with a field for one', () => {
  for (const client of connectClients.filter((held) => held.takesKey)) {
    expect(everythingCopied(client)).toContain('rc-local-4Xh2p9Fd');
  }
});

test('a client with nowhere to put a key says so instead of handing one over', () => {
  const keyless = connectClients.filter((client) => !client.takesKey);

  expect(keyless.length).toBeGreaterThan(0);

  for (const client of keyless) {
    expect(everythingCopied(client)).not.toContain('rc-local-4Xh2p9Fd');
    expect(everythingCopied(client).toLowerCase()).toContain('key');
  }
});

test('a gateway that enforces no key still hands over a value, because clients demand one', () => {
  const open = { ...servingGateway, apiKey: undefined };

  for (const client of connectClients.filter((held) => held.takesKey)) {
    expect(everythingCopied(client, open)).toContain('unused');
    expect(everythingCopied(client, open)).not.toContain('undefined');
  }
});

test('the virtual model a gateway serves reaches every client, since none can guess an id', () => {
  for (const client of connectClients) {
    expect(everythingCopied(client)).toContain('creative');
  }
});

test('a gateway serving no model hands over a stand-in rather than an empty field', () => {
  const bare = { ...servingGateway, models: [] };

  for (const client of connectClients) {
    expect(everythingCopied(client, bare)).toContain('your-model-id');
  }
});

test('no two clients answer to the same name, so the rail selects exactly one', () => {
  const ids = connectClients.map((client) => client.id);

  expect(new Set(ids).size).toBe(ids.length);
});

test('every client stands in exactly one group, and every group stands a client', () => {
  const grouped = connectGroups.flatMap((group) => group.clients);

  expect(grouped).toHaveLength(connectClients.length);
  expect(new Set(grouped.map((client) => client.id)).size).toBe(connectClients.length);

  for (const group of connectGroups) {
    expect(group.clients.length).toBeGreaterThan(0);
  }
});

test('a client the rail names is the client the sheet reads back', () => {
  expect(clientNamed('claude-code').name).toBe('Claude Code');
  expect(clientNamed('codex-cli').name).toBe('Codex CLI');
});

test('a name no client answers to falls back to the first, so the sheet always shows something', () => {
  expect(clientNamed('nothing-by-this-name').id).toBe(connectClients[0]?.id);
});

test('every client offers steps, and every step offers lines to copy', () => {
  for (const client of connectClients) {
    const steps = client.steps(servingGateway);

    expect(steps.length).toBeGreaterThan(0);

    for (const step of steps) {
      expect(step.lines.length).toBeGreaterThan(0);
      expect(step.title).not.toBe('');
      expect(step.note).not.toBe('');
    }
  }
});

const LAUNCHES: Record<string, string> = {
  'claude-code': 'claude',
  'codex-cli': 'codex',
  opencode: 'opencode',
  pi: 'pi',
  omp: 'omp --model recompose-my-gateway/creative',
  'kimi-code': 'kimi',
  'gemini-cli': 'gemini --model creative',
  'deepseek-harness': 'npx @deepseek-ai/dsh web',
};

test('every client run from a terminal shows the command that starts it', () => {
  const terminals = connectClients.filter((client) => client.kind === 'terminal');

  expect(terminals.map((client) => client.id).sort()).toEqual(Object.keys(LAUNCHES).sort());

  for (const [id, command] of Object.entries(LAUNCHES)) {
    expect(everythingCopied(clientNamed(id))).toContain(command);
  }
});

test('every id a client stores carries the gateway, so a second one never overwrites the first', () => {
  for (const client of connectClients.filter((held) => held.kind !== 'hand')) {
    const copied = everythingCopied(client);
    const named =
      copied.includes('recompose-my-gateway') || copied.includes('RECOMPOSE_MY_GATEWAY');

    expect(named || !copied.includes('recompose')).toBe(true);
  }

  expect(everythingCopied(clientNamed('codex-cli'))).toContain(
    '[model_providers.recompose-my-gateway]',
  );
  expect(everythingCopied(clientNamed('codex-cli'))).toContain(
    'RECOMPOSE_MY_GATEWAY_API_KEY="rc-local-4Xh2p9Fd" codex',
  );
});

test('no client is handed a key variable a second gateway would overwrite', () => {
  for (const client of connectClients) {
    expect(everythingCopied(client)).not.toContain('RECOMPOSE_API_KEY');
  }
});

test('a configuration that takes a list carries every model the gateway serves', () => {
  for (const id of ['opencode', 'pi', 'omp', 'kimi-code', 'deepseek-harness']) {
    const copied = everythingCopied(clientNamed(id));

    expect(copied).toContain('creative');
    expect(copied).toContain('fast');
  }
});

test('a gateway serving two models says how to reach the one a single field left out', () => {
  expect(everythingCopied(clientNamed('codex-cli'))).toContain('codex --model fast');

  const alone = { ...servingGateway, models: [{ id: 'creative', displayName: 'Creative' }] };

  expect(everythingCopied(clientNamed('codex-cli'), alone)).not.toContain('--model');
});

test('the search reads a name, and reads the dialect a person remembers instead of the name', () => {
  expect(clientsMatching(connectClients, 'codex').map((client) => client.id)).toEqual([
    'codex-cli',
    'codex-chatgpt',
  ]);
  expect(clientsMatching(connectClients, 'GEMINI').map((client) => client.id)).toEqual([
    'gemini-cli',
  ]);
  expect(clientsMatching(connectClients, '  ')).toHaveLength(connectClients.length);
  expect(clientsMatching(connectClients, 'nothing here')).toHaveLength(0);
});

test('every client names its own guide, so the sheet never stands in for the tool docs', () => {
  for (const client of connectClients) {
    expect(client.guide.href.startsWith('https://')).toBe(true);
    expect(client.guide.label).not.toBe('');
  }
});
