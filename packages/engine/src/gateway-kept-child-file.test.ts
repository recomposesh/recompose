import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { keptChildFile, KEPT_CHILD_FILE } from './gateway-kept-child-file';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (path) => rm(path, { recursive: true })),
  );
});

async function aDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'recompose-kept-children-'));

  temporaryDirectories.push(directory);

  return directory;
}

const LADDER = { slug: 'main', virtualModel: 'fast', routeNode: 'ladder' };

function aKeptChild(fingerprint: string, child: string, touchedAtMs = 1_700_000_000_000) {
  return { ...LADDER, fingerprint, child, touchedAtMs };
}

async function settled(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
}

describe('the file a gateway keeps its spread conversations in', () => {
  it('hands back a child written before the file was opened again', async () => {
    const directory = await aDirectory();

    keptChildFile(directory).keep([aKeptChild('session-1', 'one')]);
    await settled();

    expect(keptChildFile(directory).restored()).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('opens on nothing where no gateway has written yet', async () => {
    const directory = await aDirectory();

    expect(keptChildFile(directory).restored()).toEqual([]);
  });

  it('steps over a line a halted write left behind', async () => {
    const directory = await aDirectory();
    const good = JSON.stringify(aKeptChild('session-1', 'one'));

    await writeFile(join(directory, KEPT_CHILD_FILE), `${good}\n{"slug":"main","virtu`, 'utf8');

    expect(keptChildFile(directory).restored()).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('steps over a line naming something that is not a kept child', async () => {
    const directory = await aDirectory();
    const good = JSON.stringify(aKeptChild('session-1', 'one'));
    const wrong = JSON.stringify({ ...aKeptChild('session-2', 'two'), touchedAtMs: 'soon' });

    await writeFile(join(directory, KEPT_CHILD_FILE), `${wrong}\n${good}\n`, 'utf8');

    expect(keptChildFile(directory).restored()).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('collapses a burst of writes into one file the conversations fit in', async () => {
    const directory = await aDirectory();
    const file = keptChildFile(directory);

    for (let turn = 0; turn < 40; turn += 1) file.keep([aKeptChild('session-1', 'one')]);
    await settled();

    const lines = (await readFile(join(directory, KEPT_CHILD_FILE), 'utf8')).trim().split('\n');

    expect(lines).toHaveLength(1);
    expect(keptChildFile(directory).restored()).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('keeps serving a gateway whose directory it cannot write', async () => {
    const file = keptChildFile(join(await aDirectory(), 'absent', 'deeper'));

    expect(() => {
      file.keep([aKeptChild('session-1', 'one')]);
    }).not.toThrow();
    expect(file.restored()).toEqual([]);
  });
});
