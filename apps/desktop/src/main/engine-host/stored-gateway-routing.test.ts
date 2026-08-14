import type { Account, EngineVirtualModel, VirtualModel } from '@recompose/contracts';

import { engineGatewaySchema } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import { aggregatorRow, keyRow, ladderedOver, storageHolding } from './spend-grant.testkit';
import { storedEngineGateway } from './stored-gateway';

const noComplaint = (): void => undefined;

const overTwoAccounts = ladderedOver([
  { node: 'first', accountId: keyRow.id },
  { node: 'second', accountId: aggregatorRow.id, providerModel: 'gpt-5' },
]);

async function mirrorOf(
  models: readonly VirtualModel[],
  accounts: readonly Account[],
): Promise<EngineVirtualModel['routing'] | undefined> {
  const userDataPath = await storageHolding(models, accounts);
  const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

  return gateway?.virtualModels[0]?.routing;
}

describe('the engine view a router-bound virtual model is minted with', () => {
  test('every node the stored walk names is mirrored, each target worn to its standing', async () => {
    await expect(mirrorOf([overTwoAccounts], [keyRow, aggregatorRow])).resolves.toStrictEqual({
      entry: 'ladder',
      nodes: {
        ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['first', 'second'] },
        first: {
          kind: 'target',
          standing: { standing: 'bound', providerModel: 'claude-sonnet-5' },
        },
        second: { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5' } },
      },
    });
  });

  test('a child whose account left the registry stands removed while its sibling stays bound', async () => {
    const mirror = await mirrorOf([overTwoAccounts], [aggregatorRow]);

    expect(mirror?.nodes).toMatchObject({
      first: { kind: 'target', standing: { standing: 'removed' } },
      second: { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5' } },
    });
  });

  test('the round-robin mode a person chose crosses to the child as stored', async () => {
    const rotating = ladderedOver([{ node: 'first', accountId: keyRow.id }], {
      mode: 'round-robin',
    });

    const mirror = await mirrorOf([rotating], [keyRow]);

    expect(mirror?.nodes['ladder']).toStrictEqual({
      kind: 'router',
      policy: { mode: 'round-robin' },
      children: ['first'],
    });
  });
});

describe('the name a mirrored router carries', () => {
  const renamed: VirtualModel = {
    id: 'fast',
    displayName: 'fast',
    routing: {
      entry: 'ladder',
      nodes: {
        ladder: {
          kind: 'router',
          displayName: 'Weekday spend',
          policy: { mode: 'failover' },
          children: ['first'],
        },
        first: { kind: 'target', accountId: keyRow.id, providerModel: 'claude-sonnet-5' },
      },
    },
  };

  test('a router the person renamed carries that name across', async () => {
    const mirror = await mirrorOf([renamed], [keyRow]);

    expect(mirror?.nodes['ladder']).toMatchObject({ displayName: 'Weekday spend' });
  });

  test('a router the person never renamed leaves the name absent rather than undefined', async () => {
    const mirror = await mirrorOf([overTwoAccounts], [keyRow, aggregatorRow]);

    expect(mirror?.nodes['ladder']).toStrictEqual({
      kind: 'router',
      policy: { mode: 'failover' },
      children: ['first', 'second'],
    });
  });
});

describe('what a mirrored route table refuses to carry', () => {
  test('no node carries the account paying for it', async () => {
    const userDataPath = await storageHolding([overTwoAccounts], [keyRow, aggregatorRow]);
    const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

    expect(JSON.stringify(gateway)).not.toContain(keyRow.id);
    expect(JSON.stringify(gateway)).not.toContain(aggregatorRow.id);
  });

  test('the mirrored snapshot is one the protocol accepts', async () => {
    const userDataPath = await storageHolding([overTwoAccounts], [keyRow, aggregatorRow]);
    const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

    expect(() => engineGatewaySchema.parse(gateway)).not.toThrow();
  });
});
