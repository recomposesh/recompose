import { describe, expectTypeOf, test } from 'vitest';

import type {
  Account,
  AccountKind,
  AccountsDocument,
  CredentialedAccount,
  CredentialedAccountKind,
  IpcRequest,
  LocalAccount,
  LocalProviderId,
  SubscriptionAccount,
  SubscriptionProviderId,
} from './index';

import { defaultAccountsDocument, loadAccountsDocument } from './accounts';

describe('the account row the document stores', () => {
  test('the document pins itself to schema version 10', () => {
    expectTypeOf<AccountsDocument['schemaVersion']>().toEqualTypeOf<10>();
  });

  test('a stored row is a subscription, a credentialed account, or a local runtime', () => {
    expectTypeOf<AccountsDocument['accounts'][number]>().toEqualTypeOf<Account>();
    expectTypeOf<Account['kind']>().toEqualTypeOf<
      'subscription' | 'api-key' | 'aggregator' | 'local'
    >();
  });

  test('a subscription row structurally cannot reference the vault', () => {
    expectTypeOf<SubscriptionAccount>().not.toHaveProperty('credentialRef');
    expectTypeOf<Extract<Account, { kind: 'subscription' }>>().not.toHaveProperty('credentialRef');
    expectTypeOf<keyof SubscriptionAccount>().toEqualTypeOf<
      'id' | 'provider' | 'kind' | 'label' | 'provenance' | 'credentialPolicy' | 'transportPolicy'
    >();
  });

  test('a subscription row names a provider whose own tool signs it in', () => {
    expectTypeOf<SubscriptionAccount['provider']>().toEqualTypeOf<SubscriptionProviderId>();
  });

  test('no arm of a stored row has a field the key itself could occupy', () => {
    expectTypeOf<Account>().not.toHaveProperty('secret');
    expectTypeOf<Account>().not.toHaveProperty('key');
    expectTypeOf<CredentialedAccount>().not.toHaveProperty('secret');
    expectTypeOf<CredentialedAccount>().not.toHaveProperty('key');
    expectTypeOf<SubscriptionAccount>().not.toHaveProperty('secret');
    expectTypeOf<SubscriptionAccount>().not.toHaveProperty('key');
  });

  test('every kind the vocabulary names is a kind a stored row can be', () => {
    expectTypeOf<AccountKind>().toEqualTypeOf<Account['kind']>();
    expectTypeOf<CredentialedAccountKind>().toEqualTypeOf<'api-key' | 'aggregator'>();
  });
});

describe('the reference a credentialed row carries in place of its secret', () => {
  test('a credentialed row carries the reference the vault answers to', () => {
    expectTypeOf<
      Extract<Account, { kind: CredentialedAccountKind }>
    >().toEqualTypeOf<CredentialedAccount>();
    expectTypeOf<CredentialedAccount['credentialRef']>().toEqualTypeOf<string>();
    expectTypeOf<CredentialedAccount['kind']>().toEqualTypeOf<'api-key' | 'aggregator'>();
  });

  test('the read-only reference is optional, and never replaces the one requests are served with', () => {
    expectTypeOf<CredentialedAccount['readerCredentialRef']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<CredentialedAccount['credentialRef']>().not.toEqualTypeOf<string | undefined>();
    expectTypeOf<{
      id: string;
      provider: string;
      kind: CredentialedAccountKind;
      label: string;
      readerCredentialRef: string;
    }>().not.toExtend<CredentialedAccount>();
  });

  test('neither other arm of a stored row can hold a read-only reference', () => {
    expectTypeOf<SubscriptionAccount>().not.toHaveProperty('readerCredentialRef');
    expectTypeOf<LocalAccount>().not.toHaveProperty('readerCredentialRef');
  });

  test('the mask is optional, so a row stored before it existed still types', () => {
    expectTypeOf<CredentialedAccount['keyTail']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<{
      id: string;
      provider: string;
      kind: CredentialedAccountKind;
      label: string;
      credentialRef: string;
    }>().toExtend<CredentialedAccount>();
  });
});

describe('where a stored subscription row says its account came from', () => {
  test('a subscription row says where its account came from, and never leaves the answer out', () => {
    expectTypeOf<SubscriptionAccount['provenance']>().toEqualTypeOf<'sign-in' | 'machine'>();
    expectTypeOf<{
      id: string;
      provider: SubscriptionProviderId;
      kind: 'subscription';
      label: string;
    }>().not.toExtend<SubscriptionAccount>();
  });

  test('no other kind of row says where it came from, because only a subscription can be adopted', () => {
    expectTypeOf<CredentialedAccount>().not.toHaveProperty('provenance');
    expectTypeOf<LocalAccount>().not.toHaveProperty('provenance');
  });
});

describe('the local row a runtime stands as', () => {
  test('the local arm is the whole of what a local kind can be', () => {
    expectTypeOf<Extract<Account, { kind: 'local' }>>().toEqualTypeOf<LocalAccount>();
    expectTypeOf<LocalAccount['kind']>().toEqualTypeOf<'local'>();
  });

  test('a local row structurally cannot reference the vault, because nothing exists to reference', () => {
    expectTypeOf<LocalAccount>().not.toHaveProperty('credentialRef');
    expectTypeOf<Extract<Account, { kind: 'local' }>>().not.toHaveProperty('credentialRef');
  });

  test('a local row carries a name only where recompose never named the server', () => {
    expectTypeOf<LocalAccount['label']>().toEqualTypeOf<string | undefined>();
  });

  test('a local row carries the server, the address, the name, and nothing else at all', () => {
    expectTypeOf<keyof LocalAccount>().toEqualTypeOf<
      'id' | 'provider' | 'kind' | 'address' | 'label'
    >();
    expectTypeOf<LocalAccount['provider']>().toEqualTypeOf<LocalProviderId>();
    expectTypeOf<LocalAccount['address']>().toEqualTypeOf<string>();
  });

  test('a local row has no field a secret or a mask could occupy', () => {
    expectTypeOf<LocalAccount>().not.toHaveProperty('secret');
    expectTypeOf<LocalAccount>().not.toHaveProperty('key');
    expectTypeOf<LocalAccount>().not.toHaveProperty('keyTail');
  });
});

describe('the channel that connects an account', () => {
  test('connecting cannot name a subscription, because no secret exists to carry', () => {
    expectTypeOf<IpcRequest<'accounts:connect'>['kind']>().toEqualTypeOf<CredentialedAccountKind>();
    expectTypeOf<
      Extract<IpcRequest<'accounts:connect'>['kind'], 'subscription' | 'local'>
    >().toEqualTypeOf<never>();
  });
});

describe('the migration a stored document travels', () => {
  test('loading answers the current document shape, never the stored one', () => {
    expectTypeOf(loadAccountsDocument).toEqualTypeOf<(doc: unknown) => AccountsDocument>();
    expectTypeOf(defaultAccountsDocument).toEqualTypeOf<() => AccountsDocument>();
  });

  test('what a migration answers is the raw shape, so no stored row is typed before it parses', () => {
    expectTypeOf<ReturnType<typeof loadAccountsDocument>['accounts']>().toEqualTypeOf<Account[]>();
  });
});
