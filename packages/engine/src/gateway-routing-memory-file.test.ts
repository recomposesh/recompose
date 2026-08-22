import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { KEPT_CHILD_FILE } from './gateway-kept-child-file';
import { routingMemory } from './gateway-routing-memory';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    temporaryDirectories.splice(0).map(async (path) => rm(path, { recursive: true })),
  );
});

async function aDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'recompose-routing-'));

  temporaryDirectories.push(directory);

  return directory;
}

const LADDER = { slug: 'main', virtualModel: 'fast', routeNode: 'ladder' };

async function settled(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 30);
  });
}

describe('what a gateway told where to keep its conversations remembers across a restart', () => {
  it('opens the spread conversation on the account it was holding', async () => {
    vi.stubEnv('RECOMPOSE_ROUTING_DIR', await aDirectory());

    routingMemory().rotationPins.pin(LADDER, 'session-1', 'one');
    await settled();

    expect(routingMemory().rotationPins.pinnedAt(LADDER, 'session-1')).toBe('one');
  });

  it('leaves the branch a judge decided behind, which costs one fresh judgment', async () => {
    vi.stubEnv('RECOMPOSE_ROUTING_DIR', await aDirectory());

    routingMemory().pins.pin(LADDER, 'session-1', 'coder');
    await settled();

    expect(routingMemory().pins.pinnedAt(LADDER, 'session-1')).toBeUndefined();
  });

  it('keeps every conversation in memory alone where nobody named a directory', async () => {
    const directory = await aDirectory();

    vi.stubEnv('RECOMPOSE_ROUTING_DIR', '');

    routingMemory().rotationPins.pin(LADDER, 'session-1', 'one');
    await settled();

    await expect(rm(join(directory, KEPT_CHILD_FILE))).rejects.toThrow();
    expect(routingMemory().rotationPins.pinnedAt(LADDER, 'session-1')).toBeUndefined();
  });
});
