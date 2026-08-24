import type { SubscriptionsIpcContext } from './subscriptions-ipc';

import { subscriptionCredentialStore } from '../subscriptions/subscription-credential-store';
import { quietAppSignIns } from '../subscriptions/subscriptions.testkit';
import { createSubscriptionsIpcHandlers } from './subscriptions-ipc';
import { aFreshWorld } from './subscriptions-ipc.testkit';

export type Answer = { status: number; body: unknown };

/**
 * @summary One answer per ask, in the order the flow makes them, holding the last one for every
 * ask after the list runs out. A wait polls until something settles, so a list that ran dry would
 * otherwise answer nothing at all.
 */
function deviceFlowAnswering(answers: readonly Answer[]): SubscriptionsIpcContext['deviceSignIn'] {
  let turn = 0;

  return {
    ...quietAppSignIns().deviceSignIn,
    fetchLike: async () => {
      const answer = answers[Math.min(turn, answers.length - 1)];

      turn += 1;

      return Promise.resolve(
        new Response(JSON.stringify(answer?.body ?? {}), {
          status: answer?.status ?? 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    },
  };
}

export const aDeviceCode: Answer = {
  status: 200,
  body: {
    device_code: 'dev-1',
    user_code: 'ABCD-1234',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 1,
  },
};

export const authorized: Answer = { status: 200, body: { access_token: 'gho_the-token' } };

export const whoSignedIn: Answer = { status: 200, body: { login: 'someone' } };

export async function handlersAnswering(answers: readonly Answer[]) {
  const world = await aFreshWorld();
  const context = world.contextOn('linux', world.nothingHappens);

  return {
    world,
    handlers: createSubscriptionsIpcHandlers({
      ...context,
      deviceSignIn: deviceFlowAnswering(answers),
      writeSubscriptionCredential: subscriptionCredentialStore(world.userDataPath, 'linux', null)
        .write,
    }),
  };
}
