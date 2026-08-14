import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createGatewayLifecycleRequests } from './gateway-lifecycle-requests';
import {
  complained,
  directoryHolding,
  gatewayNamed,
  recordingHost,
  requestsOver,
} from './gateway-lifecycle.testkit';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a document change reaching a gateway nobody asked to serve', () => {
  test('a gateway a person stopped stays stopped when its document changes', async () => {
    const recorded = recordingHost([]);
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayNamed('codex', 8397)]),
    );

    requests.reapply('codex');

    await vi.waitFor(() => {
      expect(recorded.stateReads()).toBeGreaterThan(0);
    });
    expect(recorded.restarted).toEqual([]);
    expect(recorded.started).toEqual([]);
  });

  test('a gateway that serves takes the changed document', async () => {
    const recorded = recordingHost(['codex']);
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayNamed('codex', 8397)]),
    );

    requests.reapply('codex');

    await vi.waitFor(() => {
      expect(recorded.restarted).toHaveLength(1);
    });
    expect(recorded.restarted[0]?.slug).toBe('codex');
  });
});

describe('the restart a person picks for themselves', () => {
  test('it acts whatever the state says, because they asked for it', async () => {
    const recorded = recordingHost([]);
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayNamed('codex', 8397)]),
    );

    requests.restart('codex');

    await vi.waitFor(() => {
      expect(recorded.restarted).toHaveLength(1);
    });
  });

  test('a refusal names the restart rather than the act beside it', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const requests = requestsOver(
      { ...recordingHost(['codex']).host, restart: async () => Promise.reject(new Error('no')) },
      await directoryHolding([gatewayNamed('codex', 8397)]),
    );

    requests.restart('codex');

    await vi.waitFor(() => {
      expect(complained(complaint)).toContain('restart the gateway "codex"');
    });
  });
});

describe('one act never reaches the gateway another named', () => {
  test('one stopped gateway never holds the serving one back', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const recorded = recordingHost(['gemini']);
    const requests = requestsOver(
      recorded.host,
      await directoryHolding([gatewayNamed('codex', 8397), gatewayNamed('gemini', 8398)]),
    );

    requests.reapply('codex');
    requests.reapply('gemini');

    await vi.waitFor(() => {
      expect(recorded.restarted).toHaveLength(1);
    });
    expect(recorded.restarted[0]?.slug).toBe('gemini');
    expect(complained(complaint)).toBe('');
  });
});

describe('a reapply the engine cannot answer', () => {
  test('a reapply before the engine exists says so rather than passing for a skip', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const requests = createGatewayLifecycleRequests({
      host: () => null,
      userDataPath: () => tmpdir(),
      onCorrupt: () => undefined,
    });

    requests.reapply('codex');

    await vi.waitFor(() => {
      expect(complained(complaint)).toContain('before the engine was ready');
    });
    expect(complained(complaint)).toContain('reapply the gateway "codex"');
  });
});
