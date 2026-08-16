import type { SubscriptionProviderId } from '@recompose/contracts';

import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * What each plan's credential is called inside the home this app keeps it in.
 *
 * @summary One table serves the writer and the reader, because the two disagreeing is a home that
 * holds a credential nothing looks for: a signed-in account that reads as lapsed. A plan whose own
 * tool writes the file keeps that tool's name, so the app reads what the tool left.
 */
const credentialFileNames: Record<SubscriptionProviderId, string> = {
  anthropic: '.credentials.json',
  openai: 'auth.json',
  antigravity: 'antigravity.json',
  kimi: 'kimi.json',
  copilot: 'auth.json',
};

export function credentialFileNameFor(provider: SubscriptionProviderId): string {
  return credentialFileNames[provider];
}

/**
 * What a plan adopted from CLIProxyAPI names the file it left in an auth directory.
 *
 * @summary Neither name is fixed, so neither can be opened by path. Antigravity suffixes the
 * address it signed in as and falls back to the bare name when it has none
 * (`internal/auth/antigravity/filename.go`), while Kimi suffixes the millisecond it landed
 * (`sdk/auth/kimi.go`). Both patterns also match the plain name this app writes, so one lookup
 * finds a credential whichever of the two minted it.
 */
const adoptedNames: Record<'antigravity' | 'kimi', RegExp> = {
  antigravity: /^antigravity(-.*)?\.json$/u,
  kimi: /^kimi(-\d+)?\.json$/u,
};

function namedByPattern(provider: SubscriptionProviderId): provider is 'antigravity' | 'kimi' {
  return provider === 'antigravity' || provider === 'kimi';
}

/**
 * @summary A name the directory lists that nothing stands behind carries no moment at all, so it
 * ranks below every real file rather than being filtered out: the read that follows answers with
 * nothing for such a path anyway, and one ordering is easier to hold than an ordering and a sieve.
 */
async function newestOf(home: string, named: readonly string[]): Promise<string | null> {
  const stamped = await Promise.all(
    named.map(async (name) => {
      const path = join(home, name);
      const when = await stat(path).then(
        (found) => found.mtimeMs,
        () => Number.NEGATIVE_INFINITY,
      );

      return { path, when };
    }),
  );

  const latest = stamped.sort((one, two) => two.when - one.when)[0];

  return latest === undefined ? null : latest.path;
}

async function blobAt(path: string): Promise<string | null> {
  return readFile(path, 'utf8').then(
    (found) => found,
    () => null,
  );
}

async function newestMatching(provider: 'antigravity' | 'kimi', home: string) {
  const pattern = adoptedNames[provider];
  const listed = await readdir(home).catch(() => []);
  const path = await newestOf(
    home,
    listed.filter((name) => pattern.test(name)),
  );

  return path === null ? null : blobAt(path);
}

/**
 * The credential standing in this home, or nothing where none does.
 *
 * @summary A home holds one account, but a sign-in run twice leaves two files under the names
 * CLIProxyAPI chooses, so the newest is the one that account answers with. Reading the directory
 * rather than a path is what makes that lookup work at all: those names carry a suffix this app
 * never chose and cannot spell in advance.
 */
export async function credentialInHome(
  provider: SubscriptionProviderId,
  home: string,
): Promise<string | null> {
  return namedByPattern(provider)
    ? newestMatching(provider, home)
    : blobAt(join(home, credentialFileNameFor(provider)));
}
