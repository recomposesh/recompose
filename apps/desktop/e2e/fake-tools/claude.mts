import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { access, appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { join } from 'node:path';

import {
  address,
  carriesCredential,
  chosenExpiry,
  chosenPlan,
  chosenStore,
  desk,
  freshWindowEnds,
  machineConfigHome,
  securityCommand,
} from './tool-settings.mts';

const VENDOR_SERVICE = 'Claude Code-credentials';
const UNSEEDED_CONFIG_HOME = 3;
const RENEWAL_FAILED = 4;
const DERIVED_LENGTH = 8;

const plan = chosenPlan('Max');

/** A machine with a keychain keeps the credential there, and every other machine in a file. */
function whereClaudeKeeps(): 'keychain' | 'file' {
  return chosenStore(process.platform === 'darwin' ? 'keychain' : 'file');
}

/**
 * The keychain service one config home's credential stands under.
 *
 * @summary The real tool keeps the default home's credential under the plain service name and
 * derives a name for every other home, from the first eight hex characters of the SHA-256 of the
 * home's absolute path. `discovery/machine-probe.md` records the derivation against real entries.
 */
function serviceForHome(configHome: string | null): string {
  if (configHome === null) {
    return VENDOR_SERVICE;
  }

  const derived = createHash('sha256').update(configHome).digest('hex').slice(0, DERIVED_LENGTH);

  return `${VENDOR_SERVICE}-${derived}`;
}

function keychainKeeps(service: string, blob: string): void {
  const kept = spawnSync(
    securityCommand('Claude Code'),
    ['add-generic-password', '-U', '-s', service, '-a', userInfo().username, '-w', blob],
    { stdio: 'inherit' },
  );

  if (kept.status !== 0) {
    throw new Error(`the fake keychain refused the credential with status ${String(kept.status)}`);
  }
}

function keychainHolds(service: string): string | null {
  const read = spawnSync(
    securityCommand('Claude Code'),
    ['find-generic-password', '-s', service, '-a', userInfo().username, '-w'],
    { encoding: 'utf8' },
  );

  return read.status === 0 ? read.stdout.trimEnd() : null;
}

async function homeKeeps(home: string, blob: string): Promise<void> {
  await mkdir(home, { recursive: true });
  await writeFile(join(home, '.credentials.json'), blob, 'utf8');
}

async function homeHolds(home: string): Promise<string | null> {
  return readFile(join(home, '.credentials.json'), 'utf8').then(
    (blob) => blob,
    () => null,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function documentIn(blob: string): Record<string, unknown> {
  try {
    const held: unknown = JSON.parse(blob);

    return isRecord(held) ? held : {};
  } catch {
    return {};
  }
}

async function documentAt(path: string): Promise<Record<string, unknown>> {
  return documentIn(await readFile(path, 'utf8').catch(() => '{}'));
}

function freshToken(): string {
  return `fake-access-${randomUUID()}`;
}

function credentialBlob(accessToken: string, expiresAt: number): string {
  if (!carriesCredential) {
    return JSON.stringify({});
  }

  return JSON.stringify({
    claudeAiOauth: {
      accessToken,
      refreshToken: `fake-refresh-${accessToken}`,
      expiresAt,
      subscriptionType: plan,
    },
  });
}

function oauthIn(blob: string | null): Record<string, unknown> | null {
  if (blob === null) {
    return null;
  }

  const oauth = documentIn(blob)['claudeAiOauth'];

  return isRecord(oauth) ? oauth : null;
}

async function keepCredential(
  home: string,
  configHome: string | null,
  blob: string,
): Promise<void> {
  if (whereClaudeKeeps() === 'keychain') {
    keychainKeeps(serviceForHome(configHome), blob);

    return;
  }

  await homeKeeps(home, blob);
}

async function heldCredential(home: string, configHome: string | null): Promise<string | null> {
  const held =
    whereClaudeKeeps() === 'keychain'
      ? keychainHolds(serviceForHome(configHome))
      : await homeHolds(home);

  return held;
}

async function identityKeeps(home: string): Promise<void> {
  const held = await documentAt(join(home, '.claude.json'));

  await mkdir(home, { recursive: true });
  await writeFile(
    join(home, '.claude.json'),
    `${JSON.stringify({ ...held, oauthAccount: { emailAddress: address }, subscriptionType: plan }, null, 2)}\n`,
    'utf8',
  );
}

async function seedReached(home: string): Promise<boolean> {
  const held = await documentAt(join(home, '.claude.json'));

  return held['hasCompletedOnboarding'] === true;
}

async function traceRenewal(outcome: string): Promise<void> {
  if (desk === '') {
    return;
  }

  await appendFile(
    join(desk, 'renewals-claude.log'),
    `${JSON.stringify({ at: Date.now(), outcome })}\n`,
    'utf8',
  );
}

async function renewalWasToldToFail(): Promise<boolean> {
  if (desk === '') {
    return false;
  }

  return access(join(desk, 'renewal-fails-claude')).then(
    () => true,
    () => false,
  );
}

/**
 * @summary Claude Code keeps its identity beside the home rather than inside its config
 * folder, and moves it into a config home only when one is named. Production reads it there.
 */
function machineHomeRoot(): string {
  return machineConfigHome('Claude Code', '.');
}

function claudeMachineHome(): string {
  return machineConfigHome('Claude Code', '.claude');
}

async function signIn(): Promise<number> {
  const configHome = process.env['CLAUDE_CONFIG_DIR'] ?? null;
  const home = configHome ?? claudeMachineHome();

  if (configHome !== null && !(await seedReached(configHome))) {
    process.stderr.write('the fake Claude Code would ask its first run questions in this home\n');

    return UNSEEDED_CONFIG_HOME;
  }

  await mkdir(home, { recursive: true });
  await landTheSignIn(home, configHome);

  return 0;
}

async function landTheSignIn(home: string, configHome: string | null): Promise<void> {
  await identityKeeps(configHome ?? machineHomeRoot());
  await keepCredential(home, configHome, credentialBlob(freshToken(), chosenExpiry()));
}

async function renew(): Promise<number> {
  const home = claudeMachineHome();

  if (await renewalWasToldToFail()) {
    await traceRenewal('failed');

    return RENEWAL_FAILED;
  }

  const held = oauthIn(await heldCredential(home, null));

  await traceRenewal(held === null ? 'nothing-to-renew' : 'renewed');

  if (held === null) {
    return RENEWAL_FAILED;
  }

  await keepCredential(home, null, credentialBlob(freshToken(), freshWindowEnds()));

  return 0;
}

async function report(): Promise<number> {
  const home = claudeMachineHome();
  const held = oauthIn(await heldCredential(home, null));

  if (held === null) {
    process.stdout.write('Not logged in · Please run /login\n');

    return 0;
  }

  const account = (await documentAt(join(machineHomeRoot(), '.claude.json')))['oauthAccount'];
  const emailAddress = isRecord(account) ? account['emailAddress'] : undefined;

  process.stdout.write(
    `Logged in as ${typeof emailAddress === 'string' ? emailAddress : 'an unnamed account'}\n`,
  );

  return 0;
}

const argv = process.argv.slice(2);

if (argv[0] === 'refresh') {
  process.exitCode = await renew();
} else if (argv[0] === 'config' && argv[1] === 'ls') {
  process.exitCode = await report();
} else {
  process.exitCode = await signIn();
}
