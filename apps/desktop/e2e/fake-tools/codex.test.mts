import { realpathSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { ToolBed } from './fake-tool-bed.testkit.mts';

import { codexEntryFor } from '../keychain-shelf';
import { fakeToolBed, keychainHolds, runTool } from './fake-tool-bed.testkit.mts';

const CODEX_SERVICE = 'Codex Auth';

let bed: ToolBed;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordIn(blob: string, what: string): Record<string, unknown> {
  const held: unknown = JSON.parse(blob);

  if (!isRecord(held)) {
    throw new Error(`the fake Codex wrote ${what} that reads as no record at all`);
  }

  return held;
}

function claimsIn(idToken: unknown): Record<string, unknown> {
  const payload = typeof idToken === 'string' ? idToken.split('.')[1] : undefined;

  if (payload === undefined) {
    throw new Error('the fake Codex wrote an id_token with no claims to read');
  }

  return recordIn(Buffer.from(payload, 'base64url').toString('utf8'), 'claims');
}

async function authIn(home: string): Promise<Record<string, unknown>> {
  return recordIn(await readFile(join(home, 'auth.json'), 'utf8'), 'an auth.json');
}

function sessionIn(held: Record<string, unknown>): Record<string, unknown> {
  const tokens = held['tokens'];

  if (!isRecord(tokens)) {
    throw new Error('the fake Codex wrote a record carrying no session');
  }

  return tokens;
}

async function codexHome(name: string): Promise<string> {
  const home = join(bed.machineHome, name);

  await mkdir(home, { recursive: true });

  return home;
}

beforeEach(async () => {
  bed = await fakeToolBed();
});

afterEach(async () => {
  await bed.dispose();
});

describe('the fake Codex', () => {
  test('given a config home it was pointed at, it writes its record inside that home', async () => {
    const home = await codexHome('given-home');

    await runTool(bed, 'codex', [], { CODEX_HOME: home });

    expect(await authIn(home)).toHaveProperty('tokens');
  });

  test('given no config home, it writes its record into the machine home', async () => {
    await runTool(bed, 'codex', []);

    expect(await authIn(join(bed.machineHome, '.codex'))).toHaveProperty('tokens');
  });

  test('given a subscription, the session token carries the address and the plan as claims', async () => {
    const home = await codexHome('subscribed');

    await runTool(bed, 'codex', [], {
      CODEX_HOME: home,
      RECOMPOSE_FAKE_TOOL_ADDRESS: 'dev@example.com',
      RECOMPOSE_FAKE_TOOL_PLAN: 'Pro',
    });

    const tokens = sessionIn(await authIn(home));

    expect(claimsIn(tokens['id_token'])).toMatchObject({
      email: 'dev@example.com',
      'https://api.openai.com/auth': { chatgpt_plan_type: 'Pro' },
    });
  });

  test('given a key rather than a subscription, the record carries the key and no session', async () => {
    const home = await codexHome('keyed');

    await runTool(bed, 'codex', [], {
      CODEX_HOME: home,
      RECOMPOSE_FAKE_TOOL_CARRIES_CREDENTIAL: 'no',
    });

    const held = await authIn(home);

    expect(held['OPENAI_API_KEY']).toEqual(expect.any(String));
    expect(held).not.toHaveProperty('tokens');
  });

  test('given a keyring store, the entry is named after the home it wrote from and no file holds it', async () => {
    const home = await codexHome('kept-in-the-keyring');

    await runTool(bed, 'codex', [], {
      CODEX_HOME: home,
      RECOMPOSE_FAKE_TOOL_STORE: 'keychain',
    });

    expect(
      await keychainHolds(bed, CODEX_SERVICE, codexEntryFor(realpathSync(home))),
    ).not.toBeNull();
    expect(await keychainHolds(bed, CODEX_SERVICE)).toBeNull();
    await expect(authIn(home)).rejects.toThrow();
  });
});
