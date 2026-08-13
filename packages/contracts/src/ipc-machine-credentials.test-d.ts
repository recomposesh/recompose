import { describe, expectTypeOf, test } from 'vitest';

import type {
  IpcError,
  IpcRequest,
  IpcResponse,
  MachineCredentialReading,
  SubscriptionProviderId,
} from './index';

type FoundAccount = Extract<MachineCredentialReading, { holds: 'account' }>;

type FoundNoAccount = Exclude<MachineCredentialReading, { holds: 'account' }>;

describe('the channels that read and adopt what the machine holds', () => {
  test('both channels name a provider, because one store answers per provider', () => {
    expectTypeOf<IpcRequest<'subscriptions:detect'>>().toEqualTypeOf<{
      provider: SubscriptionProviderId;
    }>();
    expectTypeOf<IpcRequest<'subscriptions:adopt'>>().toEqualTypeOf<{
      provider: SubscriptionProviderId;
    }>();
  });

  test('reading what the machine holds answers the report and nothing beside it', () => {
    expectTypeOf<IpcResponse<'subscriptions:detect'>>().toEqualTypeOf<
      { ok: true; value: MachineCredentialReading } | { ok: false; error: IpcError }
    >();
  });

  test('adopting answers the refreshed views, the way every act on a subscription does', () => {
    expectTypeOf<IpcResponse<'subscriptions:adopt'>>().toEqualTypeOf<
      IpcResponse<'subscriptions:list'>
    >();
  });

  test('neither request carries a secret, because the store on the machine holds it', () => {
    expectTypeOf<IpcRequest<'subscriptions:detect'>>().not.toHaveProperty('secret');
    expectTypeOf<IpcRequest<'subscriptions:adopt'>>().not.toHaveProperty('secret');
  });
});

describe('the report that says what the machine holds', () => {
  test('the report names one of the four states the app can find', () => {
    expectTypeOf<MachineCredentialReading['holds']>().toEqualTypeOf<
      'account' | 'nothing' | 'no-account-credential' | 'store-refused'
    >();
  });

  test('no arm has a field the credential material could occupy', () => {
    expectTypeOf<MachineCredentialReading>().not.toHaveProperty('credential');
    expectTypeOf<MachineCredentialReading>().not.toHaveProperty('accessToken');
    expectTypeOf<MachineCredentialReading>().not.toHaveProperty('refreshToken');
    expectTypeOf<MachineCredentialReading>().not.toHaveProperty('secret');
  });

  test('the account it found names the address, the plan, and the standing, and nothing else', () => {
    expectTypeOf<keyof FoundAccount>().toEqualTypeOf<
      'holds' | 'signedInAs' | 'plan' | 'standing'
    >();
    expectTypeOf<FoundAccount['standing']>().toEqualTypeOf<'connected' | 'lapsed'>();
  });

  test('the three arms that found no account carry the state alone', () => {
    expectTypeOf<keyof FoundNoAccount>().toEqualTypeOf<'holds'>();
    expectTypeOf<FoundNoAccount['holds']>().toEqualTypeOf<
      'nothing' | 'no-account-credential' | 'store-refused'
    >();
  });
});
