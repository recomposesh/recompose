import { ACCOUNTS_VERSION, type IpcRequest, type RuntimeReachability } from '@recompose/contracts';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { LocalRuntimesIpcContext } from './local-runtimes-ipc';

import { createLocalRuntimesIpcHandlers } from './local-runtimes-ipc';

const running: RuntimeReachability = { verdict: 'answers', version: '0.5.1' };

const MOVED_TO = 11_435;

async function aFreshContext(): Promise<LocalRuntimesIpcContext> {
  return {
    userDataPath: await mkdtemp(join(tmpdir(), 'recompose-runtime-move-')),
    homeFolder: '/Users/ada',
    onCorrupt: () => undefined,
    probeRuntime: async () => Promise.resolve(running),
  };
}

type Handlers = ReturnType<typeof createLocalRuntimesIpcHandlers>;

async function stoodUp(handlers: Handlers, asked: IpcRequest<'accounts:connect-local'>) {
  const added = await handlers['accounts:connect-local'](asked);

  if (!added.ok) {
    throw new Error('the runtime never stood, so nothing can be moved');
  }

  return added.value.accounts;
}

async function holdingOllama() {
  const handlers = createLocalRuntimesIpcHandlers(await aFreshContext());
  const accounts = await stoodUp(handlers, { runtime: 'ollama' });

  return { handlers, id: accounts[0]?.id ?? '' };
}

async function holdingAServerAt(port: number) {
  const handlers = createLocalRuntimesIpcHandlers(await aFreshContext());
  const accounts = await stoodUp(handlers, { runtime: 'custom', port, label: 'their own server' });

  return { handlers, id: accounts[0]?.id ?? '' };
}

async function movedRows(handlers: Handlers, id: string, port: number) {
  const moved = await handlers['accounts:move-runtime']({ id, port });

  if (!moved.ok) {
    throw new Error('the move refused where it was meant to land');
  }

  return moved.value.accounts.filter((row) => row.kind === 'local');
}

describe('pointing a stored runtime at another port', () => {
  test('the row answers at the port it moved to', async () => {
    const { handlers, id } = await holdingOllama();

    const rows = await movedRows(handlers, id, MOVED_TO);

    expect(rows[0]?.address).toBe(`http://127.0.0.1:${String(MOVED_TO)}`);
  });

  test('the move keeps the row itself, rather than standing a second one up', async () => {
    const { handlers, id } = await holdingOllama();

    const rows = await movedRows(handlers, id, MOVED_TO);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(id);
  });

  test('what the row was named survives the move', async () => {
    const { handlers, id } = await holdingAServerAt(9_999);

    const rows = await movedRows(handlers, id, MOVED_TO);

    expect(rows[0]?.label).toBe('their own server');
  });

  test('a later look reads the new address rather than the old one', async () => {
    const { handlers, id } = await holdingOllama();

    await movedRows(handlers, id, MOVED_TO);

    await expect(handlers['accounts:check-runtime']({ id })).resolves.toEqual({
      ok: true,
      value: running,
    });
  });

  test('a documented runtime moving onto its own port is not a collision with itself', async () => {
    const { handlers, id } = await holdingOllama();

    const rows = await movedRows(handlers, id, 11_434);

    expect(rows[0]?.address).toBe('http://127.0.0.1:11434');
  });
});

describe('what a move leaves alone', () => {
  test('a move touches the row it names and no other', async () => {
    const ctx = await aFreshContext();
    const handlers = createLocalRuntimesIpcHandlers(ctx);

    await stoodUp(handlers, { runtime: 'custom', port: 8_001, label: 'the one that stays' });

    const both = await stoodUp(handlers, {
      runtime: 'custom',
      port: 8_002,
      label: 'the one that moves',
    });

    const rows = await movedRows(handlers, both.at(-1)?.id ?? '', MOVED_TO);

    expect(rows.map((row) => row.address)).toEqual([
      'http://127.0.0.1:8001',
      `http://127.0.0.1:${String(MOVED_TO)}`,
    ]);
  });

  test('a row that holds a key rather than a server refuses the move by name', async () => {
    const ctx = await aFreshContext();

    await writeFile(
      join(ctx.userDataPath, 'accounts.json'),
      JSON.stringify({
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [
          {
            id: 'key-1',
            provider: 'ollama',
            kind: 'api-key',
            label: 'their key',
            credentialRef: 'c-key-1',
          },
        ],
      }),
    );

    const moved = await createLocalRuntimesIpcHandlers(ctx)['accounts:move-runtime']({
      id: 'key-1',
      port: MOVED_TO,
    });

    expect(moved).toMatchObject({ ok: false, error: { code: 'storage-failed' } });

    if (moved.ok) {
      throw new Error('the move landed where a key row was meant to refuse it');
    }

    expect(moved.error.message).toContain('key-1');
  });
});

describe('a move that cannot land', () => {
  test('a move naming no stored row refuses rather than minting one', async () => {
    const handlers = createLocalRuntimesIpcHandlers(await aFreshContext());

    const moved = await handlers['accounts:move-runtime']({ id: 'acc-nobody', port: MOVED_TO });

    expect(moved).toMatchObject({ ok: false, error: { code: 'storage-failed' } });
  });

  test('a move onto the address another server holds refuses and leaves both standing', async () => {
    const { handlers } = await holdingAServerAt(9_999);
    const both = await stoodUp(handlers, {
      runtime: 'custom',
      port: MOVED_TO,
      label: 'their other server',
    });

    const moved = await handlers['accounts:move-runtime']({
      id: both.at(-1)?.id ?? '',
      port: 9_999,
    });

    expect(moved).toMatchObject({ ok: false, error: { code: 'name-conflict' } });
  });
});
