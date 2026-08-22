import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  aWritableDirectory,
  directoriesSwept,
  eventually,
  quietFor,
} from './gateway-kept-child.testkit';
import { routingMemory } from './gateway-routing-memory';

afterEach(async () => {
  vi.unstubAllEnvs();
  await directoriesSwept();
});

const LADDER = { slug: 'main', virtualModel: 'fast', routeNode: 'ladder' };

describe('what a gateway told where to keep its conversations remembers across a restart', () => {
  it('opens the spread conversation on the account it was holding', async () => {
    vi.stubEnv('RECOMPOSE_ROUTING_DIR', await aWritableDirectory());

    routingMemory().rotationPins.pin(LADDER, 'session-1', 'one');

    const kept = await eventually(
      () => routingMemory().rotationPins.pinnedAt(LADDER, 'session-1'),
      (child) => child !== undefined,
    );

    expect(kept).toBe('one');
  });

  it('leaves the branch a judge decided behind, which costs one fresh judgment', async () => {
    vi.stubEnv('RECOMPOSE_ROUTING_DIR', await aWritableDirectory());

    routingMemory().pins.pin(LADDER, 'session-1', 'coder');
    await quietFor(50);

    expect(routingMemory().pins.pinnedAt(LADDER, 'session-1')).toBeUndefined();
  });

  it('keeps every conversation in memory alone where nobody named a directory', async () => {
    vi.stubEnv('RECOMPOSE_ROUTING_DIR', '');

    routingMemory().rotationPins.pin(LADDER, 'session-1', 'one');
    await quietFor(50);

    expect(routingMemory().rotationPins.pinnedAt(LADDER, 'session-1')).toBeUndefined();
  });
});
