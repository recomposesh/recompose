import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
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

/**
 * The session token, shaped the way the real one is read.
 *
 * @summary `subscription-standing.ts` reads the address and the plan out of the `id_token` claims,
 * so the fake signs nothing and carries a payload segment that decodes to those claims.
 */
function sessionToken(): string {
  const claims = Buffer.from(
    JSON.stringify({
      email: address,
      'https://api.openai.com/auth': { chatgpt_plan_type: plan },
      exp: Math.floor(chosenExpiry() / 1000),
    }),
  ).toString('base64url');

  return `${Buffer.from('{"alg":"none"}').toString('base64url')}.${claims}.fake-signature`;
}

function recordBlob(): string {
  if (!carriesCredential) {
    return `${JSON.stringify({ auth_mode: 'apikey', OPENAI_API_KEY: `sk-fake-${randomUUID()}` }, null, 2)}\n`;
  }

  return `${JSON.stringify(
    {
      auth_mode: 'chatgpt',
      tokens: {
        id_token: sessionToken(),
        access_token: `fake-access-${randomUUID()}`,
        refresh_token: `fake-refresh-${randomUUID()}`,
        account_id: 'fake-account',
      },
      last_refresh: new Date().toISOString(),
    },
    null,
    2,
  )}\n`;
}

function keychainKeeps(blob: string): void {
  const kept = spawnSync(
    securityCommand('Codex'),
    ['add-generic-password', '-U', '-s', VENDOR_SERVICE, '-a', userInfo().username, '-w', blob],
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
    keychainKeeps(blob);

    return 0;
  }

  await homeKeeps(home, blob);

  return 0;
}

process.exitCode = await signIn();
