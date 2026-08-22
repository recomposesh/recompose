import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { KEPT_CHILD_FILE, keptChildFile } from './gateway-kept-child-file';
import {
  aWritableDirectory,
  directoriesSwept,
  eventually,
  quietFor,
} from './gateway-kept-child.testkit';

afterEach(directoriesSwept);

const LADDER = { slug: 'main', virtualModel: 'fast', routeNode: 'ladder' };

function aKeptChild(fingerprint: string, child: string, touchedAtMs = 1_700_000_000_000) {
  return { ...LADDER, fingerprint, child, touchedAtMs };
}

describe('the file a gateway keeps its spread conversations in', () => {
  it('hands back a child written before the file was opened again', async () => {
    const directory = await aWritableDirectory();

    keptChildFile(directory).keep([aKeptChild('session-1', 'one')]);

    const restored = await eventually(
      () => keptChildFile(directory).restored(),
      (records) => records.length > 0,
    );

    expect(restored).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('opens on nothing where no gateway has written yet', async () => {
    expect(keptChildFile(await aWritableDirectory()).restored()).toEqual([]);
  });
});

describe('what the file makes of a line it cannot trust', () => {
  it('steps over a line a halted write left behind', async () => {
    const directory = await aWritableDirectory();
    const good = JSON.stringify(aKeptChild('session-1', 'one'));

    await writeFile(join(directory, KEPT_CHILD_FILE), `${good}\n{"slug":"main","virtu`, 'utf8');

    expect(keptChildFile(directory).restored()).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('steps over a line naming something that is not a kept child', async () => {
    const directory = await aWritableDirectory();
    const good = JSON.stringify(aKeptChild('session-1', 'one'));
    const wrong = JSON.stringify({ ...aKeptChild('session-2', 'two'), touchedAtMs: 'soon' });

    await writeFile(join(directory, KEPT_CHILD_FILE), `${wrong}\n${good}\n`, 'utf8');

    expect(keptChildFile(directory).restored()).toEqual([aKeptChild('session-1', 'one')]);
  });
});

describe('how much the file writes, and where it can write at all', () => {
  it('collapses a burst of writes into one file the conversations fit in', async () => {
    const directory = await aWritableDirectory();
    const file = keptChildFile(directory);

    for (let turn = 0; turn < 40; turn += 1) file.keep([aKeptChild('session-1', 'one')]);

    const written = await eventually(
      () => keptChildFile(directory).restored(),
      (records) => records.length > 0,
    );
    const lines = (await readFile(join(directory, KEPT_CHILD_FILE), 'utf8')).trim().split('\n');

    expect(written).toEqual([aKeptChild('session-1', 'one')]);
    expect(lines).toHaveLength(1);
  });

  it('digs out the directory it was handed before writing into it', async () => {
    const directory = join(await aWritableDirectory(), 'routing', 'deeper');

    keptChildFile(directory).keep([aKeptChild('session-1', 'one')]);

    const restored = await eventually(
      () => keptChildFile(directory).restored(),
      (records) => records.length > 0,
    );

    expect(restored).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('keeps serving a gateway whose directory it can never write', async () => {
    const blocked = join(await aWritableDirectory(), 'occupied');

    await writeFile(blocked, 'a file stands where the directory would go', 'utf8');

    const file = keptChildFile(join(blocked, 'routing'));

    expect(() => {
      file.keep([aKeptChild('session-1', 'one')]);
    }).not.toThrow();

    await quietFor(50);

    expect(file.restored()).toEqual([]);
  });
});
