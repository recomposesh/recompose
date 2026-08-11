import type { EngineGateway } from '@recompose/contracts';

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createEngineHost } from './engine-host';
import { grantsNothing, hostOver, running, scriptedChild } from './engine-host.testkit';
import { gatewayHolding, storageHolding } from './spend-grant.testkit';
import {
  serveRewrittenGateway,
  startAllStoredGateways,
  startRememberedGateways,
  startStoredGateway,
  stopRemovedGateway,
} from './stored-gateway-serving';

const codex: EngineGateway = { slug: 'codex', displayName: 'Codex', port: 8397, virtualModels: [] };

const movedCodex: EngineGateway = { ...codex, port: 8399 };

const noComplaint = (): void => undefined;

function hostWithoutAnEngine() {
  return createEngineHost({
    knownSlugs: ['codex'],
    grantFor: grantsNothing,
    spawnChild: () => {
      throw new Error('the engine bundle is missing');
    },
  });
}

function spokenIn(calls: readonly unknown[][]): string {
  return calls.flat().map(String).join(' ');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a gateway recompose has just stored', () => {
  test('the stored gateway is serving without anybody having asked for it', async () => {
    const { host } = hostOver(scriptedChild(running), ['codex']);

    startStoredGateway(host)(codex);

    await vi.waitFor(() => {
      expect(host.states()).toEqual({ codex: { status: 'running' } });
    });
  });

  test('a stored gateway that never came up is written down naming the gateway', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    startStoredGateway(hostWithoutAnEngine())(codex);

    await vi.waitFor(() => {
      expect(spokenIn(complaint.mock.calls)).toContain('stored codex');
    });
  });
});

describe('a gateway recompose has just rewritten', () => {
  test('the gateway serves the document it was rewritten to', async () => {
    const scripted = scriptedChild(running);
    const { host } = hostOver(scripted, ['codex']);

    await host.start(codex);
    serveRewrittenGateway(host)(movedCodex);

    await vi.waitFor(() => {
      expect(scripted.directives.at(-1)).toMatchObject({ kind: 'start', gateway: movedCodex });
    });
  });

  test('a rewrite that never came up again is written down naming the gateway', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    serveRewrittenGateway(hostWithoutAnEngine())(codex);

    await vi.waitFor(() => {
      expect(spokenIn(complaint.mock.calls)).toContain('rewrote codex');
    });
  });
});

describe('a gateway recompose has just removed', () => {
  test('the removed gateway stops serving and leaves the ledger', async () => {
    const { host } = hostOver(
      scriptedChild(() => ({ status: 'stopped' })),
      ['codex', 'gemini'],
    );

    stopRemovedGateway(host)('codex');

    await vi.waitFor(() => {
      expect(host.states()).toEqual({ gemini: { status: 'stopped' } });
    });
  });

  test('a removed gateway that would not stop is written down naming the gateway', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    stopRemovedGateway(hostWithoutAnEngine())('codex');

    await vi.waitFor(() => {
      expect(spokenIn(complaint.mock.calls)).toContain('removed codex');
    });
  });

  test('even a stop that failed leaves nothing of the gateway in the ledger', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const host = hostWithoutAnEngine();

    stopRemovedGateway(host)('codex');

    await vi.waitFor(() => {
      expect(host.states()).toEqual({});
    });
  });
});

describe('the stored gateways standing up at launch', () => {
  test('every stored gateway serves', async () => {
    const userDataPath = await storageHolding([], []);

    await writeFile(
      join(userDataPath, 'gateways', 'work.json'),
      JSON.stringify({ ...gatewayHolding([]), slug: 'work', displayName: 'Work', port: 8398 }),
      'utf8',
    );

    const { host } = hostOver(scriptedChild(running));

    startAllStoredGateways(host, userDataPath, noComplaint);

    await vi.waitFor(() => {
      expect(host.states()).toEqual({
        personal: { status: 'running' },
        work: { status: 'running' },
      });
    });
  });

  test('a stored gateway that never came up at launch is written down naming it', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const userDataPath = await storageHolding([], []);

    startAllStoredGateways(hostWithoutAnEngine(), userDataPath, noComplaint);

    await vi.waitFor(() => {
      expect(spokenIn(complaint.mock.calls)).toContain('could not start personal at launch');
    });
  });

  test('a store that cannot be read is written down rather than failing the launch', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const userDataPath = await mkdtemp(join(tmpdir(), 'recompose-launch-'));

    await writeFile(join(userDataPath, 'gateways'), 'not a directory', 'utf8');

    startAllStoredGateways(hostOver(scriptedChild(running)).host, userDataPath, noComplaint);

    await vi.waitFor(() => {
      expect(spokenIn(complaint.mock.calls)).toContain('stored gateways at launch');
    });
  });
});

describe('the remembered gateways standing back up at launch', () => {
  test('a remembered gateway that still stands serves again', async () => {
    const userDataPath = await storageHolding([], []);
    const { host } = hostOver(scriptedChild(running));

    startRememberedGateways(host, userDataPath, noComplaint, ['personal']);

    await vi.waitFor(() => {
      expect(host.states()).toEqual({ personal: { status: 'running' } });
    });
  });

  test('a remembered gateway that left the store stays down, without a word', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const userDataPath = await storageHolding([], []);
    const { host } = hostOver(scriptedChild(running));

    startRememberedGateways(host, userDataPath, noComplaint, ['personal', 'ghost']);

    await vi.waitFor(() => {
      expect(host.states()).toEqual({ personal: { status: 'running' } });
    });

    expect(spokenIn(complaint.mock.calls)).not.toContain('ghost');
  });

  test('a remembered gateway that would not start is written down naming it', async () => {
    const complaint = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const userDataPath = await storageHolding([], []);

    startRememberedGateways(hostWithoutAnEngine(), userDataPath, noComplaint, ['personal']);

    await vi.waitFor(() => {
      expect(spokenIn(complaint.mock.calls)).toContain('remembered personal serving');
    });
  });
});
