import type { VirtualModel } from '@recompose/contracts';

import { engineGatewaySchema } from '@recompose/contracts';
import { describe, expect, test } from 'vitest';

import {
  aggregatorRow,
  gatewayHolding,
  keyRow,
  localRow,
  planRow,
  pointingAt,
  seatedAs,
  secret,
  storageHolding,
} from './spend-grant.testkit';
import { engineGatewayOf, storedEngineGateway } from './stored-gateway';

const noComplaint = (): void => undefined;

const thorough: VirtualModel = {
  id: 'thorough',
  displayName: 'thorough',
  routing: {
    entry: 'seat',
    nodes: { seat: { kind: 'target', accountId: aggregatorRow.id, providerModel: 'gpt-5' } },
  },
};

describe('what the engine hears about a stored gateway', () => {
  test('the snapshot carries the slug, the name, and the port the document holds', async () => {
    const userDataPath = await storageHolding([], []);

    await expect(storedEngineGateway(userDataPath, noComplaint, 'personal')).resolves.toMatchObject(
      { slug: 'personal', displayName: 'Personal', port: 8397 },
    );
  });

  test('a slug no stored document carries answers nothing', async () => {
    const userDataPath = await storageHolding([], []);

    await expect(storedEngineGateway(userDataPath, noComplaint, 'shared')).resolves.toBeUndefined();
  });

  test('a gateway that minted no virtual model carries an empty snapshot', async () => {
    const userDataPath = await storageHolding([], [keyRow]);
    const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

    expect(gateway?.virtualModels).toStrictEqual([]);
  });
});

describe('the standing each virtual model is minted with', () => {
  test('a target the registry still holds stands bound to the real model name', async () => {
    const userDataPath = await storageHolding([pointingAt(keyRow.id)], [keyRow]);
    const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

    expect(gateway?.virtualModels).toStrictEqual([
      {
        id: 'fast',
        displayName: 'fast',
        routing: seatedAs({ standing: 'bound', providerModel: 'claude-sonnet-5' }),
      },
    ]);
  });

  test('a local target the registry still holds stands bound', async () => {
    const userDataPath = await storageHolding([pointingAt(localRow.id)], [localRow]);
    const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

    expect(gateway?.virtualModels).toStrictEqual([
      {
        id: 'fast',
        displayName: 'fast',
        routing: seatedAs({ standing: 'bound', providerModel: 'claude-sonnet-5' }),
      },
    ]);
  });

  test('the snapshot never carries a credential', async () => {
    const userDataPath = await storageHolding([pointingAt(keyRow.id)], [keyRow]);
    const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

    expect(JSON.stringify(gateway)).not.toContain(secret);
  });
});

describe('a virtual model whose target no longer stands', () => {
  test('a target the registry no longer holds stands removed, naming no model', async () => {
    const userDataPath = await storageHolding([pointingAt(keyRow.id)], []);
    const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

    expect(gateway?.virtualModels).toStrictEqual([
      { id: 'fast', displayName: 'fast', routing: seatedAs({ standing: 'removed' }) },
    ]);
  });

  test('a subscription target the registry still holds stands bound', async () => {
    const userDataPath = await storageHolding([pointingAt(planRow.id)], [planRow]);
    const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

    expect(gateway?.virtualModels).toStrictEqual([
      {
        id: 'fast',
        displayName: 'fast',
        routing: seatedAs({ standing: 'bound', providerModel: 'claude-sonnet-5' }),
      },
    ]);
  });

  test('each virtual model is minted with its own standing', async () => {
    const userDataPath = await storageHolding([pointingAt(keyRow.id), thorough], [aggregatorRow]);
    const gateway = await storedEngineGateway(userDataPath, noComplaint, 'personal');

    expect(gateway?.virtualModels).toStrictEqual([
      { id: 'fast', displayName: 'fast', routing: seatedAs({ standing: 'removed' }) },
      {
        id: 'thorough',
        displayName: 'thorough',
        routing: seatedAs({ standing: 'bound', providerModel: 'gpt-5' }),
      },
    ]);
  });
});

describe('the snapshot a gateway about to be written serves under', () => {
  test('a config in hand resolves against the registry without being read back', async () => {
    const userDataPath = await storageHolding([], [keyRow]);
    const moving = { ...gatewayHolding([pointingAt(keyRow.id)]), port: 51234 };

    await expect(engineGatewayOf(userDataPath, noComplaint, moving)).resolves.toStrictEqual({
      slug: 'personal',
      displayName: 'Personal',
      port: 51234,
      virtualModels: [
        {
          id: 'fast',
          displayName: 'fast',
          routing: seatedAs({ standing: 'bound', providerModel: 'claude-sonnet-5' }),
        },
      ],
    });
  });
});

describe('which key the engine is trusted with', () => {
  const requiring = {
    ...gatewayHolding([]),
    apiKey: { value: 'rc-local-abcdef', required: true },
  };

  const holdingUnenforced = {
    ...gatewayHolding([]),
    apiKey: { value: 'rc-local-abcdef', required: false },
  };

  test('a gateway that requires its key hands the child the value to compare against', async () => {
    const userDataPath = await storageHolding([], []);

    await expect(engineGatewayOf(userDataPath, noComplaint, requiring)).resolves.toMatchObject({
      apiKey: 'rc-local-abcdef',
    });
  });

  test('a key the gateway stores but no longer requires never leaves the parent', async () => {
    const userDataPath = await storageHolding([], []);
    const snapshot = await engineGatewayOf(userDataPath, noComplaint, holdingUnenforced);

    expect(snapshot.apiKey).toBeUndefined();
  });

  test('an unenforced key leaves the property absent rather than undefined', async () => {
    const userDataPath = await storageHolding([], []);
    const snapshot = await engineGatewayOf(userDataPath, noComplaint, holdingUnenforced);

    expect('apiKey' in snapshot).toBe(false);
  });

  test('a gateway that never minted a key hands the child none', async () => {
    const userDataPath = await storageHolding([], []);
    const snapshot = await engineGatewayOf(userDataPath, noComplaint, gatewayHolding([]));

    expect('apiKey' in snapshot).toBe(false);
  });

  test('the snapshot the child receives is one the protocol accepts', async () => {
    const userDataPath = await storageHolding([], []);
    const snapshot = await engineGatewayOf(userDataPath, noComplaint, requiring);

    expect(() => engineGatewaySchema.parse(snapshot)).not.toThrow();
  });
});
