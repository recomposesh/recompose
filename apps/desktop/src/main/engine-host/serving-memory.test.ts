import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { rememberedServingSlugs, servingMemoryKeeper } from './serving-memory';

async function freshUserData(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'recompose-serving-memory-'));
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

    await expect.poll(async () => rememberedServingSlugs(userDataPath)).toEqual(['codex', 'spare']);
  });

  test('a closed memory records nothing more, so quitting never reads as stopping', async () => {
    const userDataPath = await freshUserData();
    const memory = servingMemoryKeeper(userDataPath);

    memory.keep({ codex: { status: 'running' } });
    await expect.poll(async () => rememberedServingSlugs(userDataPath)).toEqual(['codex']);

    memory.close();
    memory.keep({ codex: { status: 'stopped' } });

    await expect.poll(async () => rememberedServingSlugs(userDataPath)).toEqual(['codex']);
  });

  test('a first run remembers nothing serving', async () => {
    expect(await rememberedServingSlugs(await freshUserData())).toEqual([]);
  });

  test('a damaged memory reads as nothing serving rather than failing the launch', async () => {
    const userDataPath = await freshUserData();

    await writeFile(join(userDataPath, 'serving-gateways.json'), '{not json', 'utf8');

    expect(await rememberedServingSlugs(userDataPath)).toEqual([]);
  });

  test('a memory naming things that are not slugs keeps only the slugs', async () => {
    const userDataPath = await freshUserData();

    await writeFile(
      join(userDataPath, 'serving-gateways.json'),
      JSON.stringify(['codex', 7, null, 'relay']),
      'utf8',
    );

    expect(await rememberedServingSlugs(userDataPath)).toEqual(['codex', 'relay']);
  });
});

describe('a memory the disk pushes back on', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('a memory that is sound JSON but no list reads as nothing serving', async () => {
    const userDataPath = await freshUserData();

    await writeFile(join(userDataPath, 'serving-gateways.json'), '{"codex":"running"}', 'utf8');

    expect(await rememberedServingSlugs(userDataPath)).toEqual([]);
  });

  test('a keep the disk refuses complains rather than failing the state change', async () => {
    const userDataPath = await freshUserData();

    await mkdir(join(userDataPath, 'serving-gateways.json'));

    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    servingMemoryKeeper(userDataPath).keep({ codex: { status: 'running' } });

    await expect.poll(() => complaint.mock.calls.length).toBeGreaterThan(0);
    expect(complaint.mock.calls[0]?.[0]).toBe('recompose could not keep which gateways serve');
  });
});
