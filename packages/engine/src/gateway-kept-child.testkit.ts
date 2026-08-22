import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temporaryDirectories: string[] = [];

export async function aWritableDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'recompose-kept-children-'));

  temporaryDirectories.push(directory);

  return directory;
}

export async function directoriesSwept(): Promise<void> {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (path) => rm(path, { recursive: true, force: true })),
  );
}

async function aMoment(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 5);
  });
}

/**
 * What a reading says once the write behind it lands, or what it still says at the deadline.
 *
 * @summary The file is written off the request's path on purpose, so a spec resting a fixed span
 * bets on a machine that is never busy and fails on one that is. Reading until the answer arrives
 * costs a spec on an idle machine nothing and passes on a loaded one, and a deadline is what keeps
 * a behavior that never arrives failing as a wrong answer rather than as a hung suite.
 */
export async function eventually<TRead>(
  read: () => TRead,
  settled: (value: TRead) => boolean,
  deadlineMs = 5_000,
): Promise<TRead> {
  const started = Date.now();
  let value = read();

  while (!settled(value) && Date.now() - started < deadlineMs) {
    await aMoment();
    value = read();
  }

  return value;
}

export async function quietFor(spanMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, spanMs);
  });
}
