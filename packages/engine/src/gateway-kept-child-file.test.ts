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

const MOMENT = 1_700_000_000_000;

function aKeptChild(fingerprint: string, child: string, touchedAtMs = MOMENT) {
  return { ...LADDER, fingerprint, child, touchedAtMs };
}

describe('the file a gateway keeps its spread conversations in', () => {
  it('hands back a child written before the file was opened again', async () => {
    const directory = await aWritableDirectory();

    keptChildFile(directory, 'main').keep([aKeptChild('session-1', 'one')]);

    const restored = await eventually(
      () => keptChildFile(directory, 'main').restored(),
      (records) => records.length > 0,
    );

    expect(restored).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('opens on nothing where no gateway has written yet', async () => {
    expect(keptChildFile(await aWritableDirectory(), 'main').restored()).toEqual([]);
  });
});

describe('what the file makes of a line it cannot trust', () => {
  it('steps over a line a halted write left behind', async () => {
    const directory = await aWritableDirectory();
    const good = JSON.stringify(aKeptChild('session-1', 'one'));

    await writeFile(join(directory, KEPT_CHILD_FILE), `${good}\n{"slug":"main","virtu`, 'utf8');

    expect(keptChildFile(directory, 'main').restored()).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('steps over a line naming something that is not a kept child', async () => {
    const directory = await aWritableDirectory();
    const good = JSON.stringify(aKeptChild('session-1', 'one'));
    const wrong = JSON.stringify({ ...aKeptChild('session-2', 'two'), touchedAtMs: 'soon' });

    await writeFile(join(directory, KEPT_CHILD_FILE), `${wrong}\n${good}\n`, 'utf8');

    expect(keptChildFile(directory, 'main').restored()).toEqual([aKeptChild('session-1', 'one')]);
  });
});

describe('the conversations two gateways sharing one directory keep', () => {
  it('hands each gateway back its own, never the one beside it', async () => {
    const directory = await aWritableDirectory();
    const beside = { slug: 'codex', virtualModel: 'fast', routeNode: 'ladder' };
    const theirs = { ...beside, fingerprint: 'session-2', child: 'two', touchedAtMs: MOMENT };

    keptChildFile(directory, 'main').keep([aKeptChild('session-1', 'one')]);
    keptChildFile(directory, 'codex').keep([theirs]);

    const ours = await eventually(
      () => keptChildFile(directory, 'main').restored(),
      (records) => records.length > 0,
    );

    expect(ours).toEqual([aKeptChild('session-1', 'one')]);
    expect(keptChildFile(directory, 'codex').restored()).toEqual([theirs]);
  });

  it('leaves the gateway beside it alone when its own conversations all go', async () => {
    const directory = await aWritableDirectory();
    const theirs = {
      slug: 'codex',
      virtualModel: 'fast',
      routeNode: 'ladder',
      fingerprint: 'session-2',
      child: 'two',
      touchedAtMs: MOMENT,
    };

    keptChildFile(directory, 'codex').keep([theirs]);
    keptChildFile(directory, 'main').keep([aKeptChild('session-1', 'one')]);
    keptChildFile(directory, 'main').keep([]);

    await quietFor(50);

    expect(keptChildFile(directory, 'codex').restored()).toEqual([theirs]);
    expect(keptChildFile(directory, 'main').restored()).toEqual([]);
  });
});

describe('how much the file writes, and where it can write at all', () => {
  it('collapses a burst of writes into one file the conversations fit in', async () => {
    const directory = await aWritableDirectory();
    const file = keptChildFile(directory, 'main');

    for (let turn = 0; turn < 40; turn += 1) file.keep([aKeptChild('session-1', 'one')]);

    const written = await eventually(
      () => keptChildFile(directory, 'main').restored(),
      (records) => records.length > 0,
    );
    const lines = (await readFile(join(directory, KEPT_CHILD_FILE), 'utf8')).trim().split('\n');

    expect(written).toEqual([aKeptChild('session-1', 'one')]);
    expect(lines).toHaveLength(1);
  });

  it('digs out the directory it was handed before writing into it', async () => {
    const directory = join(await aWritableDirectory(), 'routing', 'deeper');

    keptChildFile(directory, 'main').keep([aKeptChild('session-1', 'one')]);

    const restored = await eventually(
      () => keptChildFile(directory, 'main').restored(),
      (records) => records.length > 0,
    );

    expect(restored).toEqual([aKeptChild('session-1', 'one')]);
  });

  it('keeps serving a gateway whose directory it can never write', async () => {
    const blocked = join(await aWritableDirectory(), 'occupied');

    await writeFile(blocked, 'a file stands where the directory would go', 'utf8');

    const file = keptChildFile(join(blocked, 'routing'), 'main');

    expect(() => {
      file.keep([aKeptChild('session-1', 'one')]);
    }).not.toThrow();

    await quietFor(50);

    expect(file.restored()).toEqual([]);
  });
});
