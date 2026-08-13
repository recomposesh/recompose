import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';

import type { AdoptedCredentialDeps } from './adopted-credential';

import { adoptedCredentialReader } from './adopted-credential';

let homeFolder = '';

const NOW = 1_000_000_000;

function aClaudeLoginExpiring(at: number): string {
  return JSON.stringify({ claudeAiOauth: { accessToken: 'opaque', expiresAt: at } });
}

async function theMachineHolds(blob: string): Promise<void> {
  await mkdir(join(homeFolder, '.claude'), { recursive: true });
  await writeFile(join(homeFolder, '.claude', '.credentials.json'), blob, 'utf8');
}

function aReader(over: Partial<AdoptedCredentialDeps> = {}) {
  const runs: string[] = [];
  const deps: AdoptedCredentialDeps = {
    reach: { homeFolder, platform: 'linux', custody: null, keyringHolds: null },
    toolFile: async () => Promise.resolve('/usr/local/bin/claude'),
    runTool: async (binary, args) => {
      runs.push([binary, ...args].join(' '));

      return Promise.resolve();
    },
    now: () => NOW,
    ...over,
  };

  return { runs, read: adoptedCredentialReader(deps) };
}

beforeEach(async () => {
  homeFolder = await mkdtemp(join(tmpdir(), 'recompose-adopted-'));
});

describe('serving on a credential the provider tool owns', () => {
  test('given a credential well short of expiry, the live store answers and no tool runs', async () => {
    const blob = aClaudeLoginExpiring(NOW + 60 * 60 * 1000);

    await theMachineHolds(blob);
    const { read, runs } = aReader();

    await expect(read('anthropic')).resolves.toBe(blob);
    expect(runs).toEqual([]);
  });

  test('given the owning tool rotated it between turns, the next turn reads what it left', async () => {
    await theMachineHolds(aClaudeLoginExpiring(NOW + 60 * 60 * 1000));
    const { read } = aReader();

    const rotated = aClaudeLoginExpiring(NOW + 90 * 60 * 1000);

    await theMachineHolds(rotated);

    await expect(read('anthropic')).resolves.toBe(rotated);
  });

  test('given nothing on the machine, the turn answers nothing rather than a stale copy', async () => {
    const { read } = aReader();

    await expect(read('anthropic')).resolves.toBeNull();
  });
});

describe('renewing through the tool that owns the credential', () => {
  test('given a credential nearing expiry, the tool is asked to renew it', async () => {
    await theMachineHolds(aClaudeLoginExpiring(NOW + 1_000));
    const { read, runs } = aReader();

    await read('anthropic');

    expect(runs).toEqual(['/usr/local/bin/claude auth status']);
  });

  test('given a provider whose tool names no headless run, nothing is spawned', async () => {
    await mkdir(join(homeFolder, '.codex'), { recursive: true });
    await writeFile(
      join(homeFolder, '.codex', 'auth.json'),
      JSON.stringify({
        tokens: {
          access_token: `header.${Buffer.from(
            JSON.stringify({ exp: Math.floor((NOW + 1_000) / 1000) }),
          ).toString('base64url')}.signature`,
        },
      }),
      'utf8',
    );

    const { read, runs } = aReader();

    await read('openai');

    expect(runs).toEqual([]);
  });

  test('given the tool renewed it, the turn serves what the tool left behind', async () => {
    const renewed = aClaudeLoginExpiring(NOW + 8 * 60 * 60 * 1000);

    await theMachineHolds(aClaudeLoginExpiring(NOW + 1_000));
    const { read } = aReader({
      runTool: async () => theMachineHolds(renewed),
    });

    await expect(read('anthropic')).resolves.toBe(renewed);
  });

  test('given the tool is gone, the turn serves what stands rather than nothing', async () => {
    const standing = aClaudeLoginExpiring(NOW + 1_000);

    await theMachineHolds(standing);
    const { read, runs } = aReader({ toolFile: async () => Promise.resolve(null) });

    await expect(read('anthropic')).resolves.toBe(standing);
    expect(runs).toEqual([]);
  });

  test('given the renewal fails, the credential stands exactly as it was', async () => {
    const standing = aClaudeLoginExpiring(NOW + 1_000);

    await theMachineHolds(standing);
    const { read } = aReader({
      runTool: async () => Promise.reject(new Error('the tool exited 1')),
    });

    await expect(read('anthropic')).resolves.toBe(standing);
  });
});
