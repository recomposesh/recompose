import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { join } from 'node:path';

const VENDOR_SERVICE = 'Claude Code-credentials';
const HOME_MARK_LENGTH = 8;
const CODEX_MARK_LENGTH = 16;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Where the fake keychain files one item, which is how the shim names what it keeps. */
function shelfIn(store: string, service: string, account = userInfo().username): string {
  return join(store, Buffer.from(`${service}\n${account}`).toString('base64url'));
}

export async function shelvedBlob(
  store: string,
  service: string,
  account?: string,
): Promise<string | null> {
  return readFile(shelfIn(store, service, account), 'utf8').then(
    (blob) => blob,
    () => null,
  );
}

/**
 * @summary Codex names its keyring entry after the config home rather than the person, from the
 * first sixteen hex characters of the SHA-256 of that home's resolved path.
 */
export function codexEntryFor(resolvedHome: string): string {
  const mark = createHash('sha256').update(resolvedHome).digest('hex').slice(0, CODEX_MARK_LENGTH);

  return `cli|${mark}`;
}

/**
 * @summary Claude Code names one keychain item per config home, deriving the name from the first
 * eight hex characters of the SHA-256 of that home's absolute path.
 */
function serviceForHome(home: string): string {
  const mark = createHash('sha256').update(home).digest('hex').slice(0, HOME_MARK_LENGTH);

  return `${VENDOR_SERVICE}-${mark}`;
}

/**
 * Where the credential for one config home stands.
 *
 * @summary Claude Code keeps its credential in the login keychain on macOS and inside the config
 * home on every other machine, so a scenario aging one reaches whichever of the two was written.
 */
function credentialKeptFor(store: string, home: string): string {
  return process.platform === 'darwin'
    ? shelfIn(store, serviceForHome(home))
    : join(home, '.credentials.json');
}

/**
 * What the app itself keeps for one config home, which is nothing for an account it adopted.
 *
 * @summary A copy kept on macOS lands in the login keychain, where no folder on disk would show
 * it, so a scenario proving the app holds no copy has to ask the store this machine actually uses.
 */
export async function credentialTheAppKeeps(store: string, home: string): Promise<string | null> {
  return readFile(credentialKeptFor(store, home), 'utf8').then(
    (blob) => blob,
    () => null,
  );
}

/**
 * Moves the lapsing moment of the credential the app signed in for one config home.
 *
 * @summary No run of a vendor tool leaves a fresh sign-in near expiry, so a scenario about the app
 * renewing what it owns has no other way to stand one there.
 */
export async function lapseTheKeptCredential(
  store: string,
  home: string,
  expiresAt: number,
): Promise<void> {
  const shelf = credentialKeptFor(store, home);
  const read: unknown = JSON.parse(await readFile(shelf, 'utf8'));
  const held = isRecord(read) ? read : {};
  const oauth = held['claudeAiOauth'];

  if (!isRecord(oauth)) {
    throw new Error(`no credential the app signed in stands under the home ${home}`);
  }

  await writeFile(
    shelf,
    JSON.stringify({ ...held, claudeAiOauth: { ...oauth, expiresAt } }),
    'utf8',
  );
}
