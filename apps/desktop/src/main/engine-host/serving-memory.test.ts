import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { rememberedServingSlugs, servingMemoryKeeper } from './serving-memory';

const quietly = (): undefined => undefined;

const MOVED_ASIDE = /^serving-gateways\.json\.corrupt-/u;

afterEach(() => {
  vi.restoreAllMocks();
});

async function freshUserData(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'recompose-serving-memory-'));
}

function memoryFile(userDataPath: string): string {
  return join(userDataPath, 'serving-gateways.json');
}

async function memoryWritten(userDataPath: string): Promise<unknown> {
  const parsed: unknown = JSON.parse(await readFile(memoryFile(userDataPath), 'utf8'));

  return parsed;
}

type MemoryReading = { serving: string[]; quarantined: string[] };

/** What one read of the memory answered, beside every path it moved aside on the way. */
async function memoryRead(userDataPath: string): Promise<MemoryReading> {
  const quarantined: string[] = [];
  const serving = await rememberedServingSlugs(userDataPath, (path) => {
    quarantined.push(path);
  });

  return { serving, quarantined };
}

/** The reading of a profile whose memory holds exactly this text. */
async function readingOf(content: string): Promise<MemoryReading & { userDataPath: string }> {
  const userDataPath = await freshUserData();

  await writeFile(memoryFile(userDataPath), content, 'utf8');

  return { ...(await memoryRead(userDataPath)), userDataPath };
}

describe('the memory of which gateways serve', () => {
  test('the running gateways of one run greet the next', async () => {
    const userDataPath = await freshUserData();
    const memory = servingMemoryKeeper(userDataPath);

    memory.keep({
      codex: { status: 'running' },
      relay: { status: 'stopped' },
      spare: { status: 'running' },
    });

    await expect
      .poll(async () => rememberedServingSlugs(userDataPath, quietly))
      .toEqual(['codex', 'spare']);
  });

  test('a closed memory records nothing more, so quitting never reads as stopping', async () => {
    const userDataPath = await freshUserData();
    const memory = servingMemoryKeeper(userDataPath);

    memory.keep({ codex: { status: 'running' } });
    await expect.poll(async () => rememberedServingSlugs(userDataPath, quietly)).toEqual(['codex']);

    memory.close();
    memory.keep({ codex: { status: 'stopped' } });

    await expect.poll(async () => rememberedServingSlugs(userDataPath, quietly)).toEqual(['codex']);
  });

  test('a first run remembers nothing serving and reads as no damage at all', async () => {
    const userDataPath = await freshUserData();
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const reading = await memoryRead(userDataPath);

    expect(reading).toEqual({ serving: [], quarantined: [] });
    expect(complaint).not.toHaveBeenCalled();
    expect(await readdir(userDataPath)).toEqual([]);
  });

  test('a memory naming things that are not slugs keeps only the slugs', async () => {
    const reading = await readingOf(
      JSON.stringify({ schemaVersion: 1, serving: ['codex', 7, null, 'relay'] }),
    );

    expect(reading.serving).toEqual(['codex', 'relay']);
  });
});

describe('the version a stored memory names', () => {
  test('the memory this build writes names the version it was written at', async () => {
    const userDataPath = await freshUserData();

    servingMemoryKeeper(userDataPath).keep({ codex: { status: 'running' } });

    await expect
      .poll(async () => memoryWritten(userDataPath))
      .toEqual({ schemaVersion: 1, serving: ['codex'] });
  });

  test('a bare list an earlier build wrote still greets this one, rather than being dropped', async () => {
    const reading = await readingOf(JSON.stringify(['codex', 'relay']));

    expect(reading).toMatchObject({ serving: ['codex', 'relay'], quarantined: [] });
    expect(await readdir(reading.userDataPath)).toEqual(['serving-gateways.json']);
  });

  test('a memory from a newer build reads as nothing serving and is left where it stands', async () => {
    const asStored = JSON.stringify({ schemaVersion: 2, serving: ['codex'] });

    const reading = await readingOf(asStored);

    expect(reading).toMatchObject({ serving: [], quarantined: [] });
    expect(await readFile(memoryFile(reading.userDataPath), 'utf8')).toBe(asStored);
  });
});

describe('a memory this build cannot read', () => {
  test('a damaged memory is moved aside and reads as nothing serving', async () => {
    const reading = await readingOf('{not json');

    expect(reading.serving).toEqual([]);
    expect(reading.quarantined).toHaveLength(1);
    expect(await readdir(reading.userDataPath)).toEqual([expect.stringMatching(MOVED_ASIDE)]);
  });

  test('a memory naming a version no build ever wrote is moved aside, list and all', async () => {
    const reading = await readingOf(JSON.stringify({ schemaVersion: 0, serving: ['codex'] }));

    expect(reading.serving).toEqual([]);
    expect(reading.quarantined).toHaveLength(1);
  });

  test('a memory holding a bare number rather than any document is moved aside', async () => {
    const reading = await readingOf('7');

    expect(reading.serving).toEqual([]);
    expect(reading.quarantined).toHaveLength(1);
  });

  test('a memory that is sound JSON but names no list is moved aside', async () => {
    const reading = await readingOf('{"codex":"running"}');

    expect(reading.serving).toEqual([]);
    expect(reading.quarantined).toHaveLength(1);
    expect(await readdir(reading.userDataPath)).toEqual([expect.stringMatching(MOVED_ASIDE)]);
  });
});

describe('a memory the disk pushes back on', () => {
  test('a keep the disk refuses complains rather than failing the state change', async () => {
    const userDataPath = await freshUserData();

    await mkdir(memoryFile(userDataPath));

    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    servingMemoryKeeper(userDataPath).keep({ codex: { status: 'running' } });

    await expect.poll(() => complaint.mock.calls.length).toBeGreaterThan(0);
    expect(complaint.mock.calls[0]?.[0]).toBe('recompose could not keep which gateways serve');
  });

  test('a memory the disk refuses to hand over complains and reads as nothing serving', async () => {
    const userDataPath = await freshUserData();

    await mkdir(memoryFile(userDataPath));

    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await rememberedServingSlugs(userDataPath, quietly)).toEqual([]);
    expect(complaint.mock.calls[0]?.[0]).toBe(
      'recompose could not read which gateways served last',
    );
  });
});
