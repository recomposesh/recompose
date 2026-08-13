import { beforeEach, describe, expect, test } from 'vitest';

import type { SubscriptionsWorld } from './subscriptions-ipc.testkit';

import { createSubscriptionsIpcHandlers } from './subscriptions-ipc';
import { aFreshWorld } from './subscriptions-ipc.testkit';

let world: SubscriptionsWorld;

beforeEach(async () => {
  world = await aFreshWorld();
});

describe('the one plan no tool signs into', () => {
  test('asking a tool to sign Copilot in refuses, because recompose owns that flow', async () => {
    const handlers = createSubscriptionsIpcHandlers(world.contextOn('linux', world.nothingHappens));

    const answered = await handlers['subscriptions:sign-in']({ provider: 'copilot' });

    expect(answered).toMatchObject({
      ok: false,
      error: { code: 'tool-missing' },
    });
  });

  test('the refusal names the plan rather than a tool nobody ships', async () => {
    const handlers = createSubscriptionsIpcHandlers(world.contextOn('linux', world.nothingHappens));

    const answered = await handlers['subscriptions:sign-in']({ provider: 'copilot' });

    expect(!answered.ok && answered.error.message).toContain('GitHub Copilot');
  });

  test('a refused ask records no account', async () => {
    const handlers = createSubscriptionsIpcHandlers(world.contextOn('linux', world.nothingHappens));

    await handlers['subscriptions:sign-in']({ provider: 'copilot' });

    const held = await handlers['subscriptions:list']();

    expect(held.ok && held.value).toEqual([]);
  });
});
