import { loopbackAddressAt, type RuntimeReachability } from '@recompose/contracts';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { LocalRuntimesIpcContext } from './local-runtimes-ipc';

import { createLocalRuntimesIpcHandlers } from './local-runtimes-ipc';

const running: RuntimeReachability = { verdict: 'answers', version: '0.5.1' };

async function aFreshContext(): Promise<LocalRuntimesIpcContext & { looked: string[] }> {
  const looked: string[] = [];

  return {
    looked,
    userDataPath: await mkdtemp(join(tmpdir(), 'recompose-own-server-')),
    homeFolder: '/Users/ada',
    onCorrupt: () => undefined,
    probeRuntime: async (address) => {
      looked.push(address);

      return Promise.resolve(running);
    },
  };
}

describe('a server a person addressed themselves', () => {
  test('the stored row carries the loopback address minted around the port they named', async () => {
    const ctx = await aFreshContext();

    const connected = await createLocalRuntimesIpcHandlers(ctx)['accounts:connect-local']({
      runtime: 'custom',
      label: 'North Rack',
      port: 9123,
    });

    if (!connected.ok) {
      throw new Error('the server was never stored, so no row stands to be read');
    }

    expect(connected.value.accounts[0]).toMatchObject({
      provider: 'custom',
      kind: 'local',
      label: 'North Rack',
      address: loopbackAddressAt(9123),
    });
  });

  test('a second server on another port stands beside the first rather than replacing it', async () => {
    const ctx = await aFreshContext();
    const handlers = createLocalRuntimesIpcHandlers(ctx);

    await handlers['accounts:connect-local']({ runtime: 'custom', label: 'North', port: 9123 });

    const connected = await handlers['accounts:connect-local']({
      runtime: 'custom',
      label: 'South',
      port: 9124,
    });

    expect(connected.ok && connected.value.accounts).toHaveLength(2);
  });

  test('a look at a server names the address its port stands for', async () => {
    const ctx = await aFreshContext();

    await createLocalRuntimesIpcHandlers(ctx)['accounts:detect-runtime']({
      runtime: 'custom',
      port: 9200,
    });

    expect(ctx.looked).toEqual([loopbackAddressAt(9200)]);
  });
});
