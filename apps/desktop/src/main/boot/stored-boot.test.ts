import { defaultSettings, type EngineStates, type Settings } from '@recompose/contracts';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { StoredBoot, StoredBootDeps } from './stored-boot';

import { rememberedServingSlugs } from '../engine-host/serving-memory';
import {
  contextFor,
  gatewayHolding,
  keyRow,
  pointingAt,
  storageHolding,
} from '../engine-host/spend-grant.testkit';
import { bootFromStoredState } from './stored-boot';

type GatewayDirective =
  | { kind: 'start'; id: string; gateway: { slug: string } }
  | { kind: 'stop'; id: string; slug: string };

const engineWire = vi.hoisted(() => {
  const heard: ((message: unknown) => void)[] = [];
  const departed: ((code: number) => void)[] = [];
  const grants: unknown[] = [];
  const counters = { forks: 0, kills: 0 };

  return {
    heard,
    departed,
    grants,
    counters,
    speak: (message: unknown) => {
      for (const listener of heard) {
        listener(message);
      }
    },
    exit: (code: number) => {
      for (const listener of departed) {
        listener(code);
      }
    },
    reset: () => {
      heard.length = 0;
      departed.length = 0;
      grants.length = 0;
      counters.forks = 0;
      counters.kills = 0;
    },
  };
});

const engineDock = vi.hoisted(() => {
  const isGatewayDirective = (message: unknown): message is GatewayDirective =>
    typeof message === 'object' &&
    message !== null &&
    'kind' in message &&
    (message.kind === 'start' || message.kind === 'stop');

  const slugOf = (directive: GatewayDirective): string =>
    directive.kind === 'start' ? directive.gateway.slug : directive.slug;

  const answer = (directive: GatewayDirective): void => {
    queueMicrotask(() => {
      const report = {
        kind: 'state',
        answers: directive.id,
        slug: slugOf(directive),
        state: { status: directive.kind === 'start' ? 'running' : 'stopped' },
      };

      for (const listener of engineWire.heard) {
        listener(report);
      }
    });
  };

  return {
    fork: () => {
      engineWire.counters.forks += 1;

      return {
        postMessage: (message: unknown) => {
          if (isGatewayDirective(message)) {
            answer(message);

            return;
          }

          engineWire.grants.push(message);
        },
        onMessage: (listener: (message: unknown) => void) => engineWire.heard.push(listener),
        onExit: (listener: (code: number) => void) => engineWire.departed.push(listener),
        kill: () => {
          engineWire.counters.kills += 1;
        },
      };
    },
  };
});

vi.mock('electron', () => ({
  app: { isPackaged: false },
  BrowserWindow: { getAllWindows: (): unknown[] => [] },
}));

vi.mock('../engine-host/spawn-engine', () => ({
  spawnEngineChild: () => engineDock.fork(),
}));

async function homeHolding(
  settings: Partial<Settings>,
  models: Parameters<typeof storageHolding>[0] = [],
  accounts: Parameters<typeof storageHolding>[1] = [],
): Promise<string> {
  const home = await storageHolding(models, accounts);

  await writeFile(
    join(home, 'settings.json'),
    JSON.stringify({ ...defaultSettings(), ...settings }),
    'utf8',
  );

  return home;
}

async function storeSecondGateway(home: string): Promise<void> {
  await writeFile(
    join(home, 'gateways', 'work.json'),
    JSON.stringify({ ...gatewayHolding([]), slug: 'work', displayName: 'Work', port: 8398 }),
    'utf8',
  );
}

function depsOver(home: string, overrides: Partial<StoredBootDeps> = {}): StoredBootDeps {
  return {
    legacyUserDataPath: join(home, 'legacy'),
    platform: 'linux',
    recomposeHome: () => home,
    onCorrupt: () => undefined,
    spendGrantContext: () => contextFor(home),
    reflectSettings: () => undefined,
    repaintStates: () => undefined,
    lifecycle: { restart: () => undefined, stop: () => undefined },
    ...overrides,
  };
}

let openBoots: StoredBoot[] = [];

async function bootedFrom(deps: StoredBootDeps): Promise<StoredBoot> {
  const boot = await bootFromStoredState(deps);

  openBoots.push(boot);

  return boot;
}

beforeEach(() => {
  engineWire.reset();
});

afterEach(() => {
  for (const boot of openBoots) {
    boot.close();
  }

  openBoots = [];
  vi.restoreAllMocks();
});

describe('what the boot brings back from the stored profile', () => {
  test('the settings the profile stores ride the boot', async () => {
    const home = await homeHolding({ startGatewaysOnLaunch: true });

    const boot = await bootedFrom(depsOver(home));

    expect(boot.settings.startGatewaysOnLaunch).toBe(true);
  });

  test('every stored gateway reads stopped before serving is asked', async () => {
    const home = await homeHolding({});
    const repainted: EngineStates[] = [];
    const repaintStates = (states: EngineStates): void => {
      repainted.push(states);
    };

    const boot = await bootedFrom(depsOver(home, { repaintStates }));

    expect(repainted).toEqual([{ personal: { status: 'stopped' } }]);
    expect(boot.engineHost.states()).toEqual({ personal: { status: 'stopped' } });
    expect(engineWire.counters.forks).toBe(0);
  });
});

describe('serving the stored gateways with the launch setting on', () => {
  test('every stored gateway stands up', async () => {
    const home = await homeHolding({ startGatewaysOnLaunch: true });

    await storeSecondGateway(home);

    const boot = await bootedFrom(depsOver(home));

    boot.serveStoredGateways();

    await vi.waitFor(() => {
      expect(boot.engineHost.states()).toEqual({
        personal: { status: 'running' },
        work: { status: 'running' },
      });
    });
  });

  test('a spend the serving engine asks about draws its grant from the stored profile', async () => {
    const home = await homeHolding(
      { startGatewaysOnLaunch: true },
      [pointingAt(keyRow.id)],
      [keyRow],
    );
    const boot = await bootedFrom(depsOver(home));

    boot.serveStoredGateways();
    await vi.waitFor(() => {
      expect(boot.engineHost.states()).toEqual({ personal: { status: 'running' } });
    });

    engineWire.speak({ kind: 'spend-request', id: 's1', slug: 'personal', virtualModel: 'fast' });

    await vi.waitFor(() => {
      expect(engineWire.grants.at(0)).toMatchObject({
        answers: 's1',
        grant: { verdict: 'resolved' },
      });
    });
  });
});

describe('serving the stored gateways with the launch setting off', () => {
  test('only the gateways the last run left serving stand back up', async () => {
    const home = await homeHolding({ startGatewaysOnLaunch: false });

    await storeSecondGateway(home);
    await writeFile(
      join(home, 'serving-gateways.json'),
      JSON.stringify(['personal', 'ghost']),
      'utf8',
    );

    const boot = await bootedFrom(depsOver(home));

    boot.serveStoredGateways();

    await vi.waitFor(() => {
      expect(boot.engineHost.states()).toEqual({
        personal: { status: 'running' },
        work: { status: 'stopped' },
      });
    });
  });

  test('with nothing remembered, nothing serves and no engine ever spawns', async () => {
    const home = await homeHolding({ startGatewaysOnLaunch: false });

    const boot = await bootedFrom(depsOver(home));

    boot.serveStoredGateways();

    expect(boot.engineHost.states()).toEqual({ personal: { status: 'stopped' } });
    expect(engineWire.counters.forks).toBe(0);
  });
});

describe('the memory a boot keeps of what serves', () => {
  test('a gateway serving is remembered for the next launch', async () => {
    const home = await homeHolding({ startGatewaysOnLaunch: true });
    const boot = await bootedFrom(depsOver(home));

    boot.serveStoredGateways();

    await expect.poll(async () => rememberedServingSlugs(home)).toEqual(['personal']);
  });

  test('quitting kills the engine child and keeps the memory of what was serving', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const home = await homeHolding({ startGatewaysOnLaunch: true });
    const boot = await bootedFrom(depsOver(home));

    boot.serveStoredGateways();
    await expect.poll(async () => rememberedServingSlugs(home)).toEqual(['personal']);

    boot.close();
    engineWire.exit(1);

    expect(engineWire.counters.kills).toBe(1);
    expect(boot.engineHost.states()).toEqual({ personal: { status: 'stopped' } });
    await expect(rememberedServingSlugs(home)).resolves.toEqual(['personal']);
  });
});
