import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  address,
  carriesCredential,
  chosenExpiry,
  chosenPlan,
  chosenStore,
  machineConfigHome,
  securityCommand,
} from './tool-settings.mts';

const VENDOR_SERVICE = 'Codex Auth';
const IDENTITY_WINDOW_SECONDS = 60 * 60;
const ENTRY_MARK_LENGTH = 16;

const plan = chosenPlan('Pro');

/**
 * Where this run keeps its record.
 *
 * @summary Codex writes `auth.json` unless the machine's keyring holds the credential instead.
 * `discovery/machine-probe.md` found both a `Codex Auth` keychain service and an `auth.json` on
 * one machine, so a scenario names the store rather than inferring it from the platform.
 */
function whereCodexKeeps(): 'keychain' | 'file' {
  return chosenStore('file');
}

/** An unsigned token whose payload segment decodes to the claims a reader looks for. */
function tokenCarrying(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');

  return `${Buffer.from('{"alg":"none"}').toString('base64url')}.${payload}.fake-signature`;
}

/**
 * The identity token, which names the account and lapses within the hour.
 *
 * @summary `credential-records.ts` reads the address and the plan out of these claims. The real
 * Codex lets this token lapse an hour after it was issued and renews it only alongside the token it
 * spends, so the fake lapses it the same way and no reading may take its moment for the record's.
 */
function identityToken(): string {
  return tokenCarrying({
    email: address,
    'https://api.openai.com/auth': { chatgpt_plan_type: plan },
    exp: Math.floor(Date.now() / 1000) + IDENTITY_WINDOW_SECONDS,
  });
}

/** The token a turn is spent with, whose moment is the one the record lapses at. */
function spentToken(): string {
  return tokenCarrying({ exp: Math.floor(chosenExpiry() / 1000) });
}

function recordBlob(): string {
  if (!carriesCredential) {
    return `${JSON.stringify({ auth_mode: 'apikey', OPENAI_API_KEY: `sk-fake-${randomUUID()}` }, null, 2)}\n`;
  }

  return `${JSON.stringify(
    {
      auth_mode: 'chatgpt',
      tokens: {
        id_token: identityToken(),
        access_token: spentToken(),
        refresh_token: `fake-refresh-${randomUUID()}`,
        account_id: 'fake-account',
      },
      last_refresh: new Date().toISOString(),
    },
    null,
    2,
  )}\n`;
}

/**
 * @summary Codex names its keyring entry after the config home rather than the person, hashing
 * that home's resolved path (`codex-rs/login/src/auth/storage.rs`, `compute_store_key`).
 */
function entryForHome(home: string): string {
  const resolved = realpathSync(home);

  return `cli|${createHash('sha256').update(resolved).digest('hex').slice(0, ENTRY_MARK_LENGTH)}`;
}

function keychainKeeps(home: string, blob: string): void {
  const kept = spawnSync(
    securityCommand('Codex'),
    ['add-generic-password', '-U', '-s', VENDOR_SERVICE, '-a', entryForHome(home), '-w', blob],
    { stdio: 'inherit' },
  );

  if (kept.status !== 0) {
    throw new Error(`the fake keyring refused the credential with status ${String(kept.status)}`);
  }
}

async function homeKeeps(home: string, blob: string): Promise<void> {
  await mkdir(home, { recursive: true });
  await writeFile(join(home, 'auth.json'), blob, { encoding: 'utf8', mode: 0o600 });
}

async function signIn(): Promise<number> {
  const home = process.env['CODEX_HOME'] ?? machineConfigHome('Codex', '.codex');
  const blob = recordBlob();

  await mkdir(home, { recursive: true });

  if (whereCodexKeeps() === 'keychain') {
    keychainKeeps(home, blob);

    return 0;
  }

  await homeKeeps(home, blob);

  return 0;
}

process.exitCode = await signIn();
