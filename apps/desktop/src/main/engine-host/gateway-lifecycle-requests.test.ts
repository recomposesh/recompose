import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { EngineHost } from './engine-host';

import { createGatewayLifecycleRequests } from './gateway-lifecycle-requests';
import {
  complained,
  directoryHolding,
  gatewayNamed,
  gatewayServing,
  recordingHost,
  requestsOver,
} from './gateway-lifecycle.testkit';
import { keyRow, seatedAs } from './spend-grant.testkit';

afterEach(() => {
  vi.restoreAllMocks();
});

const boundToTheStoredModel = [
  {
    id: 'fast',
    displayName: 'fast',
    routing: seatedAs({ standing: 'bound', providerModel: 'claude-sonnet-5' }),
  },
];

describe('the snapshot a slug-only request serves under', () => {
  test('starting hands the engine a target the registry still holds, bound', async () => {
    const recorded = recordingHost();
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayServing('codex', 8397, keyRow.id)], [keyRow]),
    );

    requests.start('codex');

    await vi.waitFor(() => {
      expect(recorded.started[0]?.virtualModels).toStrictEqual(boundToTheStoredModel);
    });
  });

  test('reapplying hands the engine a target the registry still holds, bound', async () => {
    const recorded = recordingHost(['codex']);
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayServing('codex', 8397, keyRow.id)], [keyRow]),
    );

    requests.reapply('codex');

    await vi.waitFor(() => {
      expect(recorded.restarted[0]?.virtualModels).toStrictEqual(boundToTheStoredModel);
    });
  });

  test('starting hands the engine a target the registry lost, removed', async () => {
    const recorded = recordingHost();
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayServing('codex', 8397, keyRow.id)], []),
    );

    requests.start('codex');

    await vi.waitFor(() => {
      expect(recorded.started[0]?.virtualModels).toStrictEqual([
        { id: 'fast', displayName: 'fast', routing: seatedAs({ standing: 'removed' }) },
      ]);
    });
  });
});

describe('asking the engine to act on a gateway named only by its slug', () => {
  test('starting looks the gateway up and hands the engine its name and port', async () => {
    const recorded = recordingHost();
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayNamed('codex', 8397)]),
    );

    requests.start('codex');

    await vi.waitFor(() => {
      expect(recorded.started).toEqual([
        { slug: 'codex', displayName: 'codex', port: 8397, virtualModels: [] },
      ]);
    });
  });

  test('stopping needs no document, because a slug is all a listener is filed under', async () => {
    const recorded = recordingHost();
    const requests = requestsOver(recorded.host, await directoryHolding([]));

    requests.stop('codex');

    await vi.waitFor(() => {
      expect(recorded.stopped).toEqual(['codex']);
    });
  });

  test('reapplying hands the engine the gateway it looked up', async () => {
    const recorded = recordingHost(['codex']);
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayNamed('codex', 8397)]),
    );

    requests.reapply('codex');

    await vi.waitFor(() => {
      expect(recorded.restarted).toEqual([
        { slug: 'codex', displayName: 'codex', port: 8397, virtualModels: [] },
      ]);
    });
  });

  test('one request never reaches a gateway it did not name', async () => {
    const recorded = recordingHost();
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayNamed('codex', 8397), gatewayNamed('gemini', 8398)]),
    );

    requests.start('gemini');

    await vi.waitFor(() => {
      expect(recorded.started).toEqual([
        { slug: 'gemini', displayName: 'gemini', port: 8398, virtualModels: [] },
      ]);
    });
  });
});

describe('a request the engine cannot answer', () => {
  test('a slug nothing stored names the gateway and the act it refused', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const recorded = recordingHost();
    const requests = requestsOver(recorded.host, await directoryHolding([]));

    requests.start('codex');

    await vi.waitFor(() => {
      expect(complained(complaint)).toContain('start the gateway "codex"');
    });
    expect(complained(complaint)).toContain('stores no gateway');
    expect(recorded.started).toEqual([]);
  });

  test('a request before the engine exists says so, and reaches no engine at all', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const recorded = recordingHost();
    const requests = createGatewayLifecycleRequests({
      host: () => null,
      userDataPath: () => tmpdir(),
      onCorrupt: () => undefined,
    });

    requests.stop('codex');

    await vi.waitFor(() => {
      expect(complained(complaint)).toContain('before the engine was ready');
    });
    expect(complained(complaint)).toContain('stop the gateway "codex"');
    expect(recorded.stopped).toEqual([]);
  });
});

describe('an engine that refuses a directive', () => {
  test('the refusal names the act beside the reason', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const refusing: EngineHost = {
      ...recordingHost().host,
      stop: async () => Promise.reject(new Error('the engine did not report')),
    };
    const requests = requestsOver(refusing, await directoryHolding([]));

    requests.stop('codex');

    await vi.waitFor(() => {
      expect(complained(complaint)).toContain('the engine did not report');
    });
    expect(complained(complaint)).toContain('stop the gateway "codex"');
  });

  test('a reapply the engine refuses names the reapply, not some other act', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const refusing: EngineHost = {
      ...recordingHost(['codex']).host,
      restart: async () => Promise.reject(new Error('the engine did not report')),
    };
    const requests = requestsOver(refusing, await directoryHolding([gatewayNamed('codex', 8397)]));

    requests.reapply('codex');

    await vi.waitFor(() => {
      expect(complained(complaint)).toContain('reapply the gateway "codex"');
    });
  });
});
