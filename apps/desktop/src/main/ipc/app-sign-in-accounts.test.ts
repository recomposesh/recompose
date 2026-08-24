import { beforeEach, describe, expect, test } from 'vitest';

import type { Answer } from './app-sign-in.testkit';

import { forgetPendingDeviceSignIns } from '../subscriptions/device-sign-in';
import { aDeviceCode, authorized, handlersAnswering, whoSignedIn } from './app-sign-in.testkit';

beforeEach(() => {
  forgetPendingDeviceSignIns();
});

async function signedInTwiceAs(second: Answer) {
  const { handlers } = await handlersAnswering([
    aDeviceCode,
    authorized,
    whoSignedIn,
    aDeviceCode,
    authorized,
    second,
  ]);

  await handlers['subscriptions:device-code']({ provider: 'copilot' });
  await handlers['subscriptions:device-await']({ provider: 'copilot' });
  await handlers['subscriptions:device-code']({ provider: 'copilot' });

  return handlers['subscriptions:device-await']({ provider: 'copilot' });
}

describe('the account a sign-in this app ran leaves behind', () => {
  test('the plan stands connected, because the credential landed where its reader looks', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode, authorized, whoSignedIn]);

    await handlers['subscriptions:device-code']({ provider: 'copilot' });
    const answered = await handlers['subscriptions:device-await']({ provider: 'copilot' });

    expect(answered.ok && answered.value).toMatchObject([{ standing: 'connected', active: true }]);
  });

  test('a second plan on the same channel lands under its own name and stands connected', async () => {
    const { handlers } = await handlersAnswering([
      aDeviceCode,
      { status: 200, body: { access_token: 'kimi-token', refresh_token: 'kimi-refresh' } },
    ]);

    await handlers['subscriptions:device-code']({ provider: 'kimi' });
    const answered = await handlers['subscriptions:device-await']({ provider: 'kimi' });

    expect(answered.ok && answered.value).toMatchObject([
      { provider: 'kimi', label: 'Kimi Code', standing: 'connected', provenance: 'sign-in' },
    ]);
  });

  test('a plan waiting on one code is not settled by another plan finishing first', async () => {
    const { handlers } = await handlersAnswering([aDeviceCode, authorized, whoSignedIn]);

    await handlers['subscriptions:device-code']({ provider: 'copilot' });

    const answered = await handlers['subscriptions:device-await']({ provider: 'kimi' });

    expect(answered).toMatchObject({ ok: false, error: { code: 'sign-in-timed-out' } });
  });
});

describe('one address, one account, however many times it signs in', () => {
  test('signing in again as the same person settles on the account already standing', async () => {
    const answered = await signedInTwiceAs(whoSignedIn);

    expect(answered.ok && answered.value).toMatchObject([
      { provider: 'copilot', label: 'someone' },
    ]);
    expect(answered.ok && answered.value).toHaveLength(1);
  });

  test('signing in as somebody else stands a second account beside the first', async () => {
    const answered = await signedInTwiceAs({ status: 200, body: { login: 'somebody-else' } });

    expect(answered.ok && answered.value).toMatchObject([
      { label: 'someone' },
      { label: 'somebody-else' },
    ]);
  });
});
