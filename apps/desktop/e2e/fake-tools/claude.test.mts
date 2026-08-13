import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { ToolBed, ToolRun } from './fake-tool-bed.testkit.mts';

import { deskLines, fakeToolBed, keychainHolds, runTool } from './fake-tool-bed.testkit.mts';

const VENDOR_SERVICE = 'Claude Code-credentials';
const SEEDED = `${JSON.stringify({ hasCompletedOnboarding: true, hasTrustDialogAccepted: true })}\n`;

/** Every platform reads the same store here, so a spec pins the one it asks about. */
const inTheKeychain = { RECOMPOSE_FAKE_TOOL_STORE: 'keychain' };

let bed: ToolBed;

function derivedService(home: string): string {
  return `${VENDOR_SERVICE}-${createHash('sha256').update(home).digest('hex').slice(0, 8)}`;
}

async function runClaude(
  argv: readonly string[],
  settings: Record<string, string> = {},
): Promise<ToolRun> {
  return runTool(bed, 'claude', argv, { ...inTheKeychain, ...settings });
}

async function seededHome(name: string): Promise<string> {
  const home = join(bed.machineHome, name);

  await mkdir(home, { recursive: true });
  await writeFile(join(home, '.claude.json'), SEEDED, 'utf8');

  return home;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oauthIn(blob: string | null): Record<string, unknown> {
  const held: unknown = JSON.parse(blob ?? '{}');
  const oauth = isRecord(held) ? held['claudeAiOauth'] : undefined;

  return isRecord(oauth) ? oauth : {};
}

async function machineCredential(): Promise<Record<string, unknown>> {
  return oauthIn(await keychainHolds(bed, VENDOR_SERVICE));
}

beforeEach(async () => {
  bed = await fakeToolBed();
});

afterEach(async () => {
  await bed.dispose();
});

describe('the fake Claude Code signing in', () => {
  test('given a config home recompose made, it keeps the credential under that home derived name', async () => {
    const home = await seededHome('pending');

    await runClaude([], { CLAUDE_CONFIG_DIR: home });

    expect(await keychainHolds(bed, derivedService(home))).not.toBeNull();
    expect(await keychainHolds(bed, VENDOR_SERVICE)).toBeNull();
  });

  test('given the login a person made on this machine, it keeps the credential under the plain name', async () => {
    await runClaude([]);

    expect(await keychainHolds(bed, VENDOR_SERVICE)).not.toBeNull();
  });

  test('given a home the seeding never reached, it refuses rather than signing in', async () => {
    const home = join(bed.machineHome, 'unseeded');

    await mkdir(home, { recursive: true });
    const run = await runClaude([], { CLAUDE_CONFIG_DIR: home });

    expect(run.status).not.toBe(0);
    expect(run.complained).toContain('first run');
    expect(await keychainHolds(bed, derivedService(home))).toBeNull();
  });

  test('given an expiry the scenario chose, the credential it writes carries that expiry', async () => {
    const expiresAt = 1_800_000_000_000;

    await runClaude([], { RECOMPOSE_FAKE_TOOL_EXPIRES_AT: String(expiresAt) });

    expect(await machineCredential()).toMatchObject({ expiresAt });
  });

  test('given an address and a plan the scenario chose, the home names that account', async () => {
    await runClaude([], {
      RECOMPOSE_FAKE_TOOL_ADDRESS: 'old@example.com',
      RECOMPOSE_FAKE_TOOL_PLAN: 'Pro',
    });

    const identity: unknown = JSON.parse(
      await readFile(join(bed.machineHome, '.claude.json'), 'utf8'),
    );

    expect(identity).toMatchObject({
      oauthAccount: { emailAddress: 'old@example.com' },
      subscriptionType: 'Pro',
    });
  });

  test('given a record that carries no account credential, it keeps a shell holding no login', async () => {
    await runClaude([], { RECOMPOSE_FAKE_TOOL_CARRIES_CREDENTIAL: 'no' });

    expect(await keychainHolds(bed, VENDOR_SERVICE)).not.toBeNull();
    expect(await machineCredential()).toEqual({});
  });

  test('given a file store, it writes the credential beside the home instead of the keychain', async () => {
    await runClaude([], { RECOMPOSE_FAKE_TOOL_STORE: 'file' });

    const written = await readFile(join(bed.machineHome, '.claude', '.credentials.json'), 'utf8');

    expect(oauthIn(written)).toMatchObject({ subscriptionType: 'Max' });
    expect(await keychainHolds(bed, VENDOR_SERVICE)).toBeNull();
  });
});

describe('the fake Claude Code renewing', () => {
  test('given a credential on the machine, a renewal rotates it and traces the run', async () => {
    await runClaude([], { RECOMPOSE_FAKE_TOOL_EXPIRES_AT: '1000' });
    const before = await machineCredential();

    const run = await runClaude(['auth', 'status']);

    expect(run.status).toBe(0);
    expect(await deskLines(bed, 'renewals-claude.log')).toHaveLength(1);
    expect((await machineCredential())['accessToken']).not.toBe(before['accessToken']);
    expect(Number((await machineCredential())['expiresAt'])).toBeGreaterThan(1000);
  });

  test('given a tool told to fail, the renewal leaves the credential exactly as it stood', async () => {
    await runClaude([], { RECOMPOSE_FAKE_TOOL_EXPIRES_AT: '1000' });
    const before = await machineCredential();

    await writeFile(join(bed.desk, 'renewal-fails-claude'), '', 'utf8');
    const run = await runClaude(['auth', 'status']);

    expect(run.status).not.toBe(0);
    expect(await machineCredential()).toEqual(before);
    expect(await deskLines(bed, 'renewals-claude.log')).toHaveLength(1);
  });

  test('given two renewals, the trace carries a line for each so one run reads apart from two', async () => {
    await runClaude([]);

    await runClaude(['auth', 'status']);
    await runClaude(['auth', 'status']);

    expect(await deskLines(bed, 'renewals-claude.log')).toHaveLength(2);
  });
});

describe('the fake Claude Code answering afresh', () => {
  test('given a credential on the machine, a fresh run reads as signed in', async () => {
    await runClaude([], { RECOMPOSE_FAKE_TOOL_ADDRESS: 'dev@example.com' });

    const run = await runClaude(['config', 'ls']);

    expect(run.status).toBe(0);
    expect(run.said).toContain('dev@example.com');
  });

  test('given nothing on the machine, a fresh run asks for a login', async () => {
    const run = await runClaude(['config', 'ls']);

    expect(run.said).toContain('Not logged in');
  });
});
