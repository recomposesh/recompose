import { mkdtemp, symlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';

import { credentialFileNameFor, credentialInHome } from './credential-home-file';

let home: string;

async function leave(name: string, blob: string, minutesAgo = 0): Promise<string> {
  const path = join(home, name);

  await writeFile(path, blob, 'utf8');

  const when = new Date(Date.UTC(2026, 0, 1, 12, 0, 0) - minutesAgo * 60_000);

  await utimes(path, when, when);

  return path;
}

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'recompose-credential-home-'));
});

describe('the file a plan keeps its credential in', () => {
  test('every plan names one, and the two a tool writes keep that tool’s own name', () => {
    expect(credentialFileNameFor('anthropic')).toBe('.credentials.json');
    expect(credentialFileNameFor('openai')).toBe('auth.json');
  });

  test('the plans this app signs in itself name files of their own', () => {
    expect(credentialFileNameFor('antigravity')).toBe('antigravity.json');
    expect(credentialFileNameFor('kimi')).toBe('kimi.json');
    expect(credentialFileNameFor('copilot')).toBe('auth.json');
  });

  test('no two plans that share a name would ever share a home', () => {
    expect(credentialFileNameFor('openai')).toBe(credentialFileNameFor('copilot'));
  });
});

describe('reading a credential out of a home by path', () => {
  test('a plan whose file has a fixed name is opened at that name', async () => {
    await leave('.credentials.json', 'claude-blob');

    await expect(credentialInHome('anthropic', home)).resolves.toBe('claude-blob');
  });

  test('a home holding nothing answers with nothing rather than throwing', async () => {
    await expect(credentialInHome('openai', home)).resolves.toBeNull();
  });

  test('a home that is not there at all answers the same way', async () => {
    await expect(credentialInHome('anthropic', join(home, 'nowhere'))).resolves.toBeNull();
  });

  test('a plan reads its own file rather than one another plan left beside it', async () => {
    await leave('auth.json', 'codex-blob');
    await leave('.credentials.json', 'claude-blob');

    await expect(credentialInHome('openai', home)).resolves.toBe('codex-blob');
  });
});

describe('reading a credential whose name carries a suffix this app never chose', () => {
  test('the plain name this app writes is found', async () => {
    await leave('kimi.json', 'minted-here');

    await expect(credentialInHome('kimi', home)).resolves.toBe('minted-here');
  });

  test('the stamped name the other tool writes is found too', async () => {
    await leave('kimi-1750000000000.json', 'adopted');

    await expect(credentialInHome('kimi', home)).resolves.toBe('adopted');
  });

  test('an address-suffixed Antigravity file is found, and so is the bare one', async () => {
    await leave('antigravity-ada@example.com.json', 'suffixed');

    await expect(credentialInHome('antigravity', home)).resolves.toBe('suffixed');
  });

  test('a name that only looks like the pattern is left alone', async () => {
    await leave('kimi-not-a-number.json', 'wrong');
    await leave('kimi-and-more.json', 'also wrong');

    await expect(credentialInHome('kimi', home)).resolves.toBeNull();
  });

  test('two sign-ins leave two files, and the newer one is the account’s answer', async () => {
    await leave('kimi-1000.json', 'older', 60);
    await leave('kimi-2000.json', 'newer', 1);

    await expect(credentialInHome('kimi', home)).resolves.toBe('newer');
  });

  test('the order files are listed in never decides which one answers', async () => {
    await leave('kimi-2000.json', 'newer', 1);
    await leave('kimi-1000.json', 'older', 60);

    await expect(credentialInHome('kimi', home)).resolves.toBe('newer');
  });

  test('a home holding no file of that shape answers with nothing', async () => {
    await leave('auth.json', 'somebody else');

    await expect(credentialInHome('kimi', home)).resolves.toBeNull();
  });

  test('a home nobody could read answers with nothing rather than throwing', async () => {
    await expect(credentialInHome('kimi', join(home, 'nowhere'))).resolves.toBeNull();
  });

  /**
   * @summary A name the directory lists but nothing stands behind carries no moment to sort by, so
   * a lookup that ranked it would rank it above every real file and answer with the one file it
   * cannot open. The other tool writes into a folder a person may prune under it, which is exactly
   * how a listed name outlives what it named.
   */
  test('a name standing for nothing never outranks the file that is really there', async () => {
    await symlink(join(home, 'gone.json'), join(home, 'kimi-0001.json'));
    await leave('kimi-9999.json', 'the real one', 60);

    await expect(credentialInHome('kimi', home)).resolves.toBe('the real one');
  });

  test('a home holding only a name standing for nothing answers with nothing', async () => {
    await symlink(join(home, 'gone.json'), join(home, 'kimi-9999.json'));

    await expect(credentialInHome('kimi', home)).resolves.toBeNull();
  });
});
