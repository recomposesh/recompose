import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { join } from 'node:path';

const VENDOR_SERVICE = 'Claude Code-credentials';
const HOME_MARK_LENGTH = 8;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Where the fake keychain files one item, which is how the shim names what it keeps. */
function shelfIn(store: string, service: string): string {
  return join(store, Buffer.from(`${service}\n${userInfo().username}`).toString('base64url'));
}

export async function shelvedBlob(store: string, service: string): Promise<string | null> {
  return readFile(shelfIn(store, service), 'utf8').then(
    (blob) => blob,
    () => null,
  );
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
 * Moves the lapsing moment of the credential shelved for one config home.
 *
 * @summary No run of a vendor tool leaves a fresh sign-in near expiry, so a scenario about the app
 * renewing what it owns has no other way to stand one there.
 */
export async function lapseTheShelvedCredential(
  store: string,
  home: string,
  expiresAt: number,
): Promise<void> {
  const shelf = shelfIn(store, serviceForHome(home));
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
