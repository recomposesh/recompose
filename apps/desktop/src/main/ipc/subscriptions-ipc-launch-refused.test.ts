import { beforeEach, describe, expect, test } from 'vitest';

import type { SubscriptionsIpcContext } from './subscriptions-ipc';
import type { SubscriptionsWorld } from './subscriptions-ipc.testkit';

import { createSubscriptionsIpcHandlers } from './subscriptions-ipc';
import { aFreshWorld, refusalIn } from './subscriptions-ipc.testkit';

let world: SubscriptionsWorld;

const NO_TERMINAL = 'no terminal emulator on this machine could run claude /login';
const NOTHING_TO_SAY = 'recompose could not open a terminal for the sign-in.';

function handlersWhere(launch: SubscriptionsIpcContext['launch']) {
  return createSubscriptionsIpcHandlers({
    ...world.contextOn('linux', launch),
    signInBoundMs: 0,
    noteLaunchRefused: world.noteLaunchRefused,
  });
}

function refusing(cause: unknown) {
  return async () => {
    await Promise.resolve();

    throw cause;
  };
}

async function aSignInWhere(launch: SubscriptionsIpcContext['launch']) {
  await world.toolInstalled('claude');

  return handlersWhere(launch)['subscriptions:sign-in']({ provider: 'anthropic' });
}

beforeEach(async () => {
  world = await aFreshWorld();
});

describe('a terminal that never opened', () => {
  test('the person is told, rather than left watching a wait that cannot end', async () => {
    await aSignInWhere(refusing(new Error(NO_TERMINAL)));

    expect(world.launchRefusals).toEqual([{ provider: 'anthropic', note: NO_TERMINAL }]);
  });

  test('the reason reaching the screen is the one the launch gave', async () => {
    await aSignInWhere(refusing(new Error(NO_TERMINAL)));

    expect(world.launchRefusals[0]?.note).toContain('terminal emulator');
  });

  test('the wait still runs, because the command stays on screen for a person to run by hand', async () => {
    const answered = await aSignInWhere(refusing(new Error(NO_TERMINAL)));

    expect(refusalIn(answered).code).toBe('sign-in-timed-out');
  });

  test('given the terminal opens, nothing is said about a launch', async () => {
    await aSignInWhere(world.nothingHappens);

    expect(world.launchRefusals).toEqual([]);
  });
});

describe('a failure with no sentence in it', () => {
  test('a blank message still reaches the screen as something a person can read', async () => {
    await aSignInWhere(refusing(new Error('   ')));

    expect(world.launchRefusals[0]?.note).toBe(NOTHING_TO_SAY);
  });

  test('a failure that is not an error at all reaches the screen the same way', async () => {
    const notAnError: unknown = { why: 'nothing opened' };

    await aSignInWhere(refusing(notAnError));

    expect(world.launchRefusals[0]?.note).toBe(NOTHING_TO_SAY);
  });

  test('a reason the tool padded arrives trimmed, because the screen holds one line', async () => {
    await aSignInWhere(refusing(new Error(`  ${NO_TERMINAL}  `)));

    expect(world.launchRefusals[0]?.note).toBe(NO_TERMINAL);
  });
});
