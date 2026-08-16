import { expect, test } from 'vitest';

import type { ConnectClient, ConnectFacts } from './connect-facts';

import { clientNamed, clientsMatching, connectClients, connectGroups } from './connect-catalog';
import { addressFor } from './connect-facts';

const serving: ConnectFacts = {
  gatewayName: 'My Gateway',
  baseUrl: 'http://127.0.0.1:8397',
  apiKey: 'rc-local-4Xh2p9Fd',
  modelId: 'creative',
};

function everythingCopied(client: ConnectClient, facts: ConnectFacts = serving): string {
  return client
    .steps(facts)
    .flatMap((step) => [...step.lines, step.note])
    .join('\n');
}

function everySpellingOfTheAddress(client: ConnectClient): readonly string[] {
  return everythingCopied(client)
    .split(serving.baseUrl)
    .slice(1)
    .map((rest) => (rest.startsWith('/v1') ? 'v1' : 'origin'));
}

test('every client is handed the gateway address spelled the way that client joins its paths', () => {
  for (const client of connectClients) {
    const spellings = everySpellingOfTheAddress(client);

    expect(spellings.length).toBeGreaterThan(0);

    if (client.reach !== 'whole') {
      expect(new Set(spellings)).toEqual(new Set([client.reach]));
      expect(everythingCopied(client)).toContain(addressFor(client.reach, serving));
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
  const open = { ...serving, apiKey: undefined };

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
  const bare = { ...serving, modelId: undefined };

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
    const steps = client.steps(serving);

    expect(steps.length).toBeGreaterThan(0);

    for (const step of steps) {
      expect(step.lines.length).toBeGreaterThan(0);
      expect(step.title).not.toBe('');
      expect(step.note).not.toBe('');
    }
  }
});

test('Claude Code is pointed by the two variables it reads at startup', () => {
  const copied = everythingCopied(clientNamed('claude-code'));

  expect(copied).toContain('export ANTHROPIC_BASE_URL=http://127.0.0.1:8397');
  expect(copied).toContain('export ANTHROPIC_AUTH_TOKEN=rc-local-4Xh2p9Fd');
  expect(copied).toContain('export ANTHROPIC_MODEL=creative');
});

test('Codex is pointed by a user-level provider block that speaks the Responses dialect', () => {
  const copied = everythingCopied(clientNamed('codex-cli'));

  expect(copied).toContain('[model_providers.recompose]');
  expect(copied).toContain('base_url = "http://127.0.0.1:8397/v1"');
  expect(copied).toContain('wire_api = "responses"');
  expect(copied).toContain('model = "creative"');
});

test('Gemini CLI keeps the bare origin, because it appends the version segment itself', () => {
  const copied = everythingCopied(clientNamed('gemini-cli'));

  expect(copied).toContain('export GOOGLE_GEMINI_BASE_URL=http://127.0.0.1:8397');
  expect(copied).toContain('export GEMINI_API_KEY=rc-local-4Xh2p9Fd');
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
