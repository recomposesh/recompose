import { expect, test } from 'vitest';

import type { ConnectFacts } from './connect-facts';

import {
  everyLineCopied,
  everythingCopied,
  servingGateway,
} from '../testing/connect-facts.testkit';
import { clientNamed, connectClients } from './connect-catalog';

/** A line handing one variable to the command its block ends in, quoted the way a paste needs. */
const CARRIES_A_VARIABLE = /^\s*[A-Z][A-Z\d_]*="[^"]*"/u;

function blockTitled(id: string, opening: string): readonly string[] {
  const step = clientNamed(id)
    .steps(servingGateway)
    .find((held) => held.title.startsWith(opening));

  if (step === undefined) {
    throw new Error(`${id} offers no block titled ${opening}`);
  }

  return step.lines;
}

test('Claude Code takes one command carrying every variable it reads at startup', () => {
  expect(blockTitled('claude-code', 'Point it at the gateway')).toEqual([
    'ANTHROPIC_BASE_URL="http://127.0.0.1:8397" \\',
    '  ANTHROPIC_AUTH_TOKEN="rc-local-4Xh2p9Fd" \\',
    '  ANTHROPIC_MODEL="creative" \\',
    '  CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY="1" \\',
    '  ANTHROPIC_CUSTOM_MODEL_OPTION="creative" claude',
  ]);
});

test("a model id Claude Code's picker would skip rides in on the variable that adds it anyway", () => {
  const copied = everythingCopied(clientNamed('claude-code'));

  expect(copied).toContain('ANTHROPIC_CUSTOM_MODEL_OPTION="creative" claude');
  expect(copied).toContain('skips this id');
});

test('a model id that picker keeps needs no such variable, because discovery finds it', () => {
  const copied = everythingCopied(clientNamed('claude-code'), {
    ...servingGateway,
    models: [{ id: 'claude-creative', displayName: 'Creative' }],
  });

  expect(copied).not.toContain('ANTHROPIC_CUSTOM_MODEL_OPTION');
  expect(copied).not.toContain('skips this id');
  expect(copied).toContain('CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY="1" claude');
});

function settingsBlockOf(facts: ConnectFacts): unknown {
  const copied = everyLineCopied(clientNamed('claude-code'), facts);

  return JSON.parse(copied.slice(copied.indexOf('{')));
}

test('the settings file carries every variable the command does, since agents read that path', () => {
  expect(settingsBlockOf(servingGateway)).toEqual({
    env: {
      ANTHROPIC_BASE_URL: 'http://127.0.0.1:8397',
      ANTHROPIC_AUTH_TOKEN: 'rc-local-4Xh2p9Fd',
      ANTHROPIC_MODEL: 'creative',
      CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '1',
      ANTHROPIC_CUSTOM_MODEL_OPTION: 'creative',
    },
  });
});

test('a kept id leaves the settings file with no escape, because discovery finds it', () => {
  const block = settingsBlockOf({
    ...servingGateway,
    models: [{ id: 'claude-creative', displayName: 'Creative' }],
  });

  expect(block).toEqual({
    env: {
      ANTHROPIC_BASE_URL: 'http://127.0.0.1:8397',
      ANTHROPIC_AUTH_TOKEN: 'rc-local-4Xh2p9Fd',
      ANTHROPIC_MODEL: 'claude-creative',
      CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '1',
    },
  });
});

test('Codex is pointed by a user-level provider block that speaks the Responses dialect', () => {
  const copied = everythingCopied(clientNamed('codex-cli'));

  expect(copied).toContain('[model_providers.recompose-my-gateway]');
  expect(copied).toContain('base_url = "http://127.0.0.1:8397/v1"');
  expect(copied).toContain('wire_api = "responses"');
  expect(copied).toContain('model = "creative"');
});

test('one variable in front of a command needs no wrapping, so Codex starts on a single line', () => {
  expect(blockTitled('codex-cli', 'Hand it the key')).toEqual([
    'RECOMPOSE_MY_GATEWAY_API_KEY="rc-local-4Xh2p9Fd" codex',
  ]);
});

test('Gemini CLI takes the bare origin and the key in front of the command that reads them', () => {
  expect(blockTitled('gemini-cli', 'Point it at the gateway')).toEqual([
    'GOOGLE_GEMINI_BASE_URL="http://127.0.0.1:8397" \\',
    '  GEMINI_API_KEY="rc-local-4Xh2p9Fd" gemini --model creative',
  ]);
});

test('the DeepSeek harness starts again carrying the key its settings file only names', () => {
  expect(blockTitled('deepseek-harness', 'Start it again')).toEqual([
    'RECOMPOSE_MY_GATEWAY_API_KEY="rc-local-4Xh2p9Fd" npx @deepseek-ai/dsh web',
  ]);
});

test('no block a person copies leaves a variable set in the shell it was pasted into', () => {
  for (const client of connectClients) {
    expect(everyLineCopied(client)).not.toContain('export ');
  }
});

test('a block carrying variables ends in the command that reads them, so the paste runs once', () => {
  const blocks = connectClients
    .flatMap((client) => client.steps(servingGateway))
    .map((step) => step.lines)
    .filter((lines) => lines.some((line) => CARRIES_A_VARIABLE.test(line)));

  expect(blocks.length).toBeGreaterThan(0);

  for (const lines of blocks) {
    const closing = lines.at(-1) ?? '';

    expect(lines.slice(0, -1).every((line) => line.endsWith(' \\'))).toBe(true);
    expect(closing.endsWith('\\')).toBe(false);
    expect(closing.replace(CARRIES_A_VARIABLE, '').trim()).not.toBe('');
  }
});
