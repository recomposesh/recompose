import {
  ACCOUNTS_VERSION,
  GATEWAY_CONFIG_VERSION,
  type IpcError,
  type VirtualModel,
} from '@recompose/contracts';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { deskHolding, gatewayServing, storedBytes } from './gateway-storage.testkit';

const fast: VirtualModel = {
  id: 'fast',
  displayName: 'Fast',
  routing: {
    entry: 't1',
    nodes: {
      t1: { kind: 'target', accountId: 'acc-key', providerModel: 'claude-haiku-4-5' },
    },
  },
};

function refusalIn(answer: { ok: true } | { ok: false; error: IpcError }): IpcError {
  if (answer.ok) {
    throw new Error('the update landed where the spec expected a refusal');
  }

  return answer.error;
}

describe('an update to a gateway already on disk', () => {
  test('the definition a person added reaches the stored document', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    const answer = await desk.handlers['gateways:update'](gatewayServing([fast]));

    expect(answer).toEqual({ ok: true, value: [gatewayServing([fast])] });
  });

  test('the rewritten document is what a later read answers with', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    await desk.handlers['gateways:update'](gatewayServing([fast]));

    await expect(desk.handlers['gateways:list'](undefined)).resolves.toEqual({
      ok: true,
      value: [gatewayServing([fast])],
    });
  });
});

describe('an update nothing can stand on', () => {
  test('a slug nothing is stored under is refused rather than created', async () => {
    const desk = await deskHolding([]);

    const answer = await desk.handlers['gateways:update'](gatewayServing([fast]));

    expect(refusalIn(answer).code).toBe('storage-failed');
    expect(refusalIn(answer).message).toContain('codex');
  });

  test('a refused update writes no document and asks the engine for nothing', async () => {
    const desk = await deskHolding([]);

    await desk.handlers['gateways:update'](gatewayServing([fast]));

    await expect(desk.handlers['gateways:list'](undefined)).resolves.toEqual({
      ok: true,
      value: [],
    });
    expect(desk.restarted).toEqual([]);
  });

  test('a slug nobody holds is refused even while another gateway stands beside it', async () => {
    const desk = await deskHolding([gatewayServing([])]);
    const stranger = { ...gatewayServing([fast]), slug: 'gemini', displayName: 'Gemini' };

    const answer = await desk.handlers['gateways:update'](stranger);

    expect(refusalIn(answer).code).toBe('storage-failed');
    expect(refusalIn(answer).message).toContain('gemini');
    await expect(desk.handlers['gateways:list'](undefined)).resolves.toEqual({
      ok: true,
      value: [gatewayServing([])],
    });
  });

  test('a registry no build can read leaves the stored document exactly as it stood', async () => {
    const desk = await deskHolding([gatewayServing([])]);
    const before = await storedBytes(desk.userDataPath, 'codex');

    await writeFile(
      join(desk.userDataPath, 'accounts.json'),
      JSON.stringify({ schemaVersion: ACCOUNTS_VERSION + 1, accounts: [] }),
      'utf8',
    );

    const answer = await desk.handlers['gateways:update'](gatewayServing([fast]));

    expect(answer).toMatchObject({ ok: false, error: { code: 'accounts-newer-schema' } });
    expect(await storedBytes(desk.userDataPath, 'codex')).toBe(before);
    expect(desk.restarted).toEqual([]);
  });
});

describe('a gateways directory no build can read', () => {
  test('a document a newer build wrote refuses the listing rather than answering none', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    await writeFile(
      join(desk.userDataPath, 'gateways', 'codex.json'),
      JSON.stringify({ ...gatewayServing([]), schemaVersion: GATEWAY_CONFIG_VERSION + 1 }),
      'utf8',
    );

    await expect(desk.handlers['gateways:list'](undefined)).resolves.toMatchObject({
      ok: false,
      error: { code: 'storage-failed' },
    });
  });
});

describe('a port arriving through an update', () => {
  test('the stored port stands, because the move lane owns ports and this one does not', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    const answer = await desk.handlers['gateways:update'](gatewayServing([fast], 9001));

    expect(answer).toEqual({ ok: true, value: [gatewayServing([fast])] });
  });

  test('the answer corrects the caller rather than storing the port it sent', async () => {
    const desk = await deskHolding([gatewayServing([])]);

    await desk.handlers['gateways:update'](gatewayServing([fast], 9001));

    const stored = await storedBytes(desk.userDataPath, 'codex');

    expect(JSON.parse(stored)).toMatchObject({ port: 8397, virtualModels: [fast] });
    expect(desk.restarted[0]?.port).toBe(8397);
  });
});

describe('an update beside a save', () => {
  test('two writes arriving at once take the gateways directory one at a time', async () => {
    const desk = await deskHolding([gatewayServing([])]);
    const gemini = { ...gatewayServing([]), slug: 'gemini', displayName: 'Gemini', port: 8398 };

    const [updated, saved] = await Promise.all([
      desk.handlers['gateways:update'](gatewayServing([fast])),
      desk.handlers['gateways:save'](gemini),
    ]);

    expect(updated.ok).toBe(true);
    expect(saved.ok).toBe(true);

    await expect(desk.handlers['gateways:list'](undefined)).resolves.toEqual({
      ok: true,
      value: [gatewayServing([fast]), gemini],
    });
  });
});
