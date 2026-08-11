import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { LocalRuntimesIpcContext } from './local-runtimes-ipc';

import { createLocalRuntimesIpcHandlers } from './local-runtimes-ipc';

async function aContextOverANotFolder(): Promise<LocalRuntimesIpcContext> {
  const blockingDir = await mkdtemp(join(tmpdir(), 'recompose-runtimes-blocked-'));
  const notAFolder = join(blockingDir, 'not-a-folder');

  await writeFile(notAFolder, '', 'utf8');

  return {
    userDataPath: notAFolder,
    homeFolder: '/Users/ada',
    onCorrupt: () => undefined,
    probeRuntime: async () => Promise.resolve({ verdict: 'answers', version: '0.5.1' }),
  };
}

describe('a registry that cannot be read', () => {
  test('connecting a runtime answers a typed storage failure rather than throwing', async () => {
    const handlers = createLocalRuntimesIpcHandlers(await aContextOverANotFolder());

    const connected = await handlers['accounts:connect-local']({ runtime: 'ollama' });

    expect(connected).toMatchObject({ ok: false, error: { code: 'storage-failed' } });
  });

  test('checking a stored runtime answers a typed storage failure rather than throwing', async () => {
    const handlers = createLocalRuntimesIpcHandlers(await aContextOverANotFolder());

    const checked = await handlers['accounts:check-runtime']({ id: 'acc-runtime' });

    expect(checked).toMatchObject({ ok: false, error: { code: 'storage-failed' } });
  });
});
