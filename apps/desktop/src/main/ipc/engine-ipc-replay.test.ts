import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import type { EngineHost } from '../engine-host/engine-host';
import type { EngineIpcContext } from './engine-ipc';

import { createEngineIpcHandlers } from './engine-ipc';

/**
 * A host that counts the asks rather than answering them, since a replay carries nothing back.
 *
 * @summary Both readings go out on their own push, so what a scenario here can observe is which
 * desk was reached and how often, and never what it sent.
 */
function hostCountingReplays() {
  const asked = { logs: 0, traffic: 0 };
  const refuses = async (): Promise<never> => Promise.reject(new Error('not under test'));

  const host: EngineHost = {
    replayLogs: () => {
      asked.logs += 1;
    },
    replayTraffic: () => {
      asked.traffic += 1;
    },
    retainedLogRows: () => [],
    start: refuses,
    stop: refuses,
    restart: refuses,
    states: () => ({}),
    onStatesChanged: () => () => undefined,
    probe: async () => Promise.resolve({ verdict: 'could-not-check' as const }),
    probeRuntime: async () => Promise.resolve({ verdict: 'unreachable' as const }),
    listModels: async () => Promise.resolve({ standing: 'unlisted' as const }),
    claudeAddress: async () => {
      await Promise.resolve();

      return undefined;
    },
    dispose: () => undefined,
  };

  return { asked, host };
}

async function handlersOver(host: EngineHost) {
  const context: EngineIpcContext = {
    userDataPath: await mkdtemp(join(tmpdir(), 'recompose-engine-replay-')),
    homeFolder: '/Users/ada',
    onCorrupt: () => undefined,
    host,
    probeFreePort: async () => Promise.resolve(51234),
  };

  return createEngineIpcHandlers(context);
}

describe('sending the request log to a renderer that just bound', () => {
  test('the ask reaches the desk holding the history, and answers with no rows of its own', async () => {
    const answering = hostCountingReplays();
    const handlers = await handlersOver(answering.host);

    await expect(handlers['engine:replay-logs'](undefined)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(answering.asked.logs).toBe(1);
  });

  test('a reload that asks again reaches the desk again, because every run merges by row id', async () => {
    const answering = hostCountingReplays();
    const handlers = await handlersOver(answering.host);

    await handlers['engine:replay-logs'](undefined);
    await handlers['engine:replay-logs'](undefined);

    expect(answering.asked.logs).toBe(2);
  });
});

describe('sending the live traffic to a renderer that just bound', () => {
  test('the ask reaches the desk holding the snapshot, and answers with no traffic of its own', async () => {
    const answering = hostCountingReplays();
    const handlers = await handlersOver(answering.host);

    await expect(handlers['engine:replay-traffic'](undefined)).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(answering.asked.traffic).toBe(1);
  });

  test('a second window that asks reaches the desk again, because each push carries the whole snapshot', async () => {
    const answering = hostCountingReplays();
    const handlers = await handlersOver(answering.host);

    await handlers['engine:replay-traffic'](undefined);
    await handlers['engine:replay-traffic'](undefined);

    expect(answering.asked.traffic).toBe(2);
  });
});

describe('the two replays standing apart', () => {
  test('asking for the traffic leaves the request log alone, so neither ask stands for the other', async () => {
    const answering = hostCountingReplays();
    const handlers = await handlersOver(answering.host);

    await handlers['engine:replay-traffic'](undefined);

    expect(answering.asked.logs).toBe(0);
  });

  test('asking for the request log leaves the traffic alone, for the same reason', async () => {
    const answering = hostCountingReplays();
    const handlers = await handlersOver(answering.host);

    await handlers['engine:replay-logs'](undefined);

    expect(answering.asked.traffic).toBe(0);
  });
});
