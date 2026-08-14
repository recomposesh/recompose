import { describe, expect, test } from 'vitest';

import { deskHolding, gatewayServing, storedBytes } from './gateway-storage.testkit';

const KEY = 'rc-local-abcdef';

function requiring() {
  return { ...gatewayServing([]), apiKey: { value: KEY, required: true } };
}

function holdingUnenforced() {
  return { ...gatewayServing([]), apiKey: { value: KEY, required: false } };
}

describe('the key a rewrite carries to disk', () => {
  test('turning the requirement on stores the key beside the requirement', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    await desk.handlers['gateways:update'](requiring());

    expect(await storedBytes(desk.userDataPath, 'codex')).toContain(KEY);
  });

  test('turning the requirement off keeps the value the clients already carry', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    await desk.handlers['gateways:update'](requiring());
    await desk.handlers['gateways:update'](holdingUnenforced());

    expect(await storedBytes(desk.userDataPath, 'codex')).toContain(KEY);
  });

  test('a rewrite carrying no key at all leaves none stored', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    await desk.handlers['gateways:update'](requiring());
    await desk.handlers['gateways:update'](gatewayServing([]));

    expect(await storedBytes(desk.userDataPath, 'codex')).not.toContain(KEY);
  });
});

describe('what the engine hears the moment the key changes', () => {
  test('a serving gateway takes the key at once', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    await desk.handlers['gateways:update'](requiring());

    expect(desk.restarted.at(-1)?.apiKey).toBe(KEY);
  });

  test('the key leaves the child the moment the requirement goes off', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    await desk.handlers['gateways:update'](requiring());
    await desk.handlers['gateways:update'](holdingUnenforced());

    expect(desk.restarted.at(-1)?.apiKey).toBeUndefined();
  });
});
