import { readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { KeptChild, PinKeeping } from './gateway-kept-child';
import type { RouteNodeAddress } from './routing/route-node-key';

export const KEPT_CHILD_FILE = 'kept-children.jsonl';

const WRITE_SETTLES_MS = 10;

function missingFile(failure: unknown): boolean {
  return (
    typeof failure === 'object' && failure !== null && Reflect.get(failure, 'code') === 'ENOENT'
  );
}

function spoken(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

function parsedObject(line: string): object | undefined {
  try {
    const read: unknown = JSON.parse(line);

    return typeof read === 'object' && read !== null ? read : undefined;
  } catch {
    return undefined;
  }
}

function whereItStood(read: object): RouteNodeAddress | undefined {
  const slug: unknown = Reflect.get(read, 'slug');
  const virtualModel: unknown = Reflect.get(read, 'virtualModel');
  const routeNode: unknown = Reflect.get(read, 'routeNode');

  if (!spoken(slug) || !spoken(virtualModel) || !spoken(routeNode)) return undefined;

  return { slug, virtualModel, routeNode };
}

type WhoAndWhen = { fingerprint: string; child: string; touchedAtMs: number };

function whoItKeptAndWhen(read: object): WhoAndWhen | undefined {
  const fingerprint: unknown = Reflect.get(read, 'fingerprint');
  const child: unknown = Reflect.get(read, 'child');
  const touchedAtMs: unknown = Reflect.get(read, 'touchedAtMs');

  if (!spoken(fingerprint) || !spoken(child)) return undefined;

  if (typeof touchedAtMs !== 'number' || !Number.isSafeInteger(touchedAtMs)) return undefined;

  return { fingerprint, child, touchedAtMs };
}

/**
 * One line read back as a kept child, or nothing where the line says something else.
 *
 * @summary Every field is read rather than trusted. A write the app never finished leaves half a
 * line behind, and a file a person opened leaves whatever they typed. A line failing the reading is
 * dropped on its own, so one bad line costs one conversation rather than the whole file.
 */
function keptChildOf(line: string): KeptChild | undefined {
  const read = parsedObject(line);

  if (read === undefined) return undefined;

  const address = whereItStood(read);
  const kept = whoItKeptAndWhen(read);

  return address === undefined || kept === undefined ? undefined : { ...address, ...kept };
}

function linesOf(path: string): readonly string[] {
  try {
    return readFileSync(path, 'utf8').split('\n');
  } catch (failure) {
    if (missingFile(failure)) return [];

    console.error(`The engine child could not read ${path}, so it kept no conversation.`, failure);

    return [];
  }
}

function recordsIn(path: string): readonly KeptChild[] {
  return linesOf(path).flatMap((line) => {
    const record = keptChildOf(line);

    return record === undefined ? [] : [record];
  });
}

type SharedFile = { forGateway: (slug: string) => PinKeeping };

/**
 * The one writer standing over a directory, however many gateways keep conversations in it.
 *
 * @summary Every gateway in a process shares the directory the app hands the engine child, and each
 * one holds its own conversations. One writer per directory is what keeps the last gateway to write
 * from erasing the others, and it serializes the writes so no two land on the same file at once.
 * A gateway reads back only what it wrote, because a conversation belongs to the gateway that spread
 * it and the pin below never asks about anyone else's.
 */
function sharedFile(directory: string): SharedFile {
  const path = join(directory, KEPT_CHILD_FILE);
  const held = new Map<string, readonly KeptChild[]>();
  let pending: ReturnType<typeof setTimeout> | undefined;
  let writing: Promise<void> = Promise.resolve();
  let opened = false;

  const openOnce = () => {
    if (opened) return;

    opened = true;

    for (const record of recordsIn(path)) {
      held.set(record.slug, [...(held.get(record.slug) ?? []), record]);
    }
  };

  const write = async (): Promise<void> => {
    const written = [...held.values()]
      .flat()
      .map((record) => JSON.stringify(record))
      .join('\n');

    try {
      await mkdir(directory, { recursive: true });
      await writeFile(`${path}.writing`, written === '' ? '' : `${written}\n`, 'utf8');
      await rename(`${path}.writing`, path);
    } catch (failure) {
      console.error(`The engine child could not keep its conversations in ${path}.`, failure);
    }
  };

  return {
    forGateway: (slug) => ({
      restored: () => recordsIn(path).filter((record) => record.slug === slug),
      keep: (records) => {
        openOnce();
        held.set(slug, records);

        if (pending !== undefined) return;

        pending = setTimeout(() => {
          pending = undefined;
          writing = writing.then(write);
        }, WRITE_SETTLES_MS);
        pending.unref();
      },
    }),
  };
}

const sharedFiles = new Map<string, SharedFile>();

/**
 * The file one gateway keeps its spread conversations in, across a restart of the engine child.
 *
 * @summary A conversation resuming state one account minted can only travel to that account, so
 * forgetting where it was kept costs the person a refusal they can only answer by starting over.
 * That is what the cooling and the turn cursors never owed disk and this does. Writes coalesce and
 * land whole through a rename, because a gateway hands over its entire set every time and a person
 * killing the app mid-write must not open on half a file.
 */
export function keptChildFile(directory: string, slug: string): PinKeeping {
  const shared = sharedFiles.get(directory) ?? sharedFile(directory);

  sharedFiles.set(directory, shared);

  return shared.forGateway(slug);
}
