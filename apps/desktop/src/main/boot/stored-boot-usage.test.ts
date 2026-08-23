import type { EngineGateway, LogRow, UsageLedger } from '@recompose/contracts';

import { ACCOUNTS_VERSION, defaultSettings, usageLedgerSchema } from '@recompose/contracts';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { StoredBoot, StoredBootDeps } from './stored-boot';

import { running, scriptedChild } from '../engine-host/engine-host.testkit';
import { contextFor, storageHolding } from '../engine-host/spend-grant.testkit';
import { isRecord } from '../storage/json-file';
import { PLAN_USAGE_VERSION } from '../usage/plan-usage-store';
import { bootFromStoredState } from './stored-boot';

type Dock = { scripted: ReturnType<typeof scriptedChild> | null };

const dock = vi.hoisted((): Dock => ({ scripted: null }));

vi.mock('electron', () => ({
  app: { isPackaged: false },
  BrowserWindow: { getAllWindows: (): unknown[] => [] },
}));

vi.mock('../engine-host/spawn-engine', () => ({
  spawnEngineChild: () => {
    if (dock.scripted === null) {
      throw new Error('no engine serves in this spec');
    }

    return dock.scripted.child;
  },
}));

const clientKey = `sha256:${'a'.repeat(64)}`;

function aGatewayServing(): EngineGateway {
  return {
    slug: 'codex',
    displayName: 'Codex',
    port: 8397,
    virtualModels: [
      {
        id: 'fast',
        displayName: 'fast',
        routing: {
          entry: 'only',
          nodes: {
            only: { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5-mini' } },
          },
        },
      },
    ],
  };
}

function aSettledRow(id: string, accountId: string): LogRow {
  const anHourAgo = Date.now() - 3_600_000;

  return {
    id,
    at: anHourAgo - (anHourAgo % 3_600_000),
    gateway: 'codex',
    virtualModel: 'fast',
    origin: 'provider',
    method: 'POST',
    provider: 'anthropic',
    accountId,
    providerModel: 'claude-sonnet-4-5',
    status: 200,
    durationMs: 912,
    tokens: 1_820,
    clientKey,
  };
}

const RESETS_LONG_FROM_NOW = 4_102_444_800_000;

const RESET_LONG_AGO = 1_000_000_000_000;

function aPlanReading(spentShare: number) {
  return {
    accountId: 'sub-1',
    provider: 'anthropic',
    readAt: 1_754_524_800_000,
    windows: [{ length: '5h', spentShare, resetsAt: RESETS_LONG_FROM_NOW }],
  };
}

async function storedPlanUsage(home: string, readings: unknown): Promise<void> {
  await writeFile(
    join(home, 'plan-usage.json'),
    JSON.stringify({ schemaVersion: PLAN_USAGE_VERSION, readings }),
    'utf8',
  );
}

async function storedPlanReadings(home: string): Promise<unknown> {
  const document: unknown = JSON.parse(await readFile(join(home, 'plan-usage.json'), 'utf8'));

  return isRecord(document) ? document['readings'] : undefined;
}

function aPlanRead(spentShare: number): unknown {
  return { kind: 'plan-usage', reading: aPlanReading(spentShare) };
}

async function storedUsage(home: string): Promise<UsageLedger> {
  return usageLedgerSchema.parse(JSON.parse(await readFile(join(home, 'usage.json'), 'utf8')));
}

async function aStampedBucket(boot: StoredBoot) {
  const report = await boot.usageStore.report({ range: '24h' });
  const stamped = report.buckets.findLast((bucket) => bucket.tuple.accountKind !== undefined);

  if (stamped === undefined) {
    throw new Error('no stamped bucket yet');
  }

  return stamped;
}

async function eventually<Value>(read: () => Promise<Value>): Promise<Value> {
  for (let breath = 0; breath < 600; breath += 1) {
    try {
      return await read();
    } catch {
      await new Promise((rested) => {
        setTimeout(rested, 25);
      });
    }
  }

  return read();
}

async function aQuietHome(): Promise<string> {
  const home = await storageHolding([], []);

  await writeFile(join(home, 'settings.json'), JSON.stringify(defaultSettings()), 'utf8');

  return home;
}

function depsOver(home: string): StoredBootDeps {
  return {
    legacyUserDataPath: join(home, 'legacy'),
    platform: 'linux',
    recomposeHome: () => home,
    onCorrupt: () => undefined,
    spendGrantContext: () => contextFor(home),
    reflectSettings: () => undefined,
    repaintStates: () => undefined,
    lifecycle: { reapply: () => undefined, stop: () => undefined },
  };
}

let openBoots: StoredBoot[] = [];

afterEach(() => {
  for (const boot of openBoots) {
    boot.close();
  }

  openBoots = [];
  vi.restoreAllMocks();
});

describe('the usage ledger the boot stands up', () => {
  test('the boot opens a usage store that answers the quiet truth', async () => {
    const boot = await bootFromStoredState(depsOver(await aQuietHome()));

    openBoots.push(boot);

    const report = await boot.usageStore.report({ range: '24h' });

    expect(report.buckets).toEqual([]);
    expect(report.oldestRetainedStart).toBeGreaterThan(0);
  });

  test('a request the engine settles reaches the ledger on disk once the gateway stops', async () => {
    const home = await aQuietHome();
    const boot = await bootFromStoredState(depsOver(home));

    openBoots.push(boot);
    dock.scripted = scriptedChild(running);

    await boot.engineHost.start(aGatewayServing());
    dock.scripted.send({ kind: 'log', row: aSettledRow('log-1', 'work') });
    await boot.engineHost.stop('codex');

    const ledger = await eventually(async () => storedUsage(home));

    expect(ledger.buckets.at(0)?.measures.requests).toBe(1);
    expect(ledger.buckets.at(0)?.tuple.gateway).toBe('codex');
  });

  test('an account connected after boot stamps its kind on the rows that follow', async () => {
    const home = await aQuietHome();
    const boot = await bootFromStoredState(depsOver(home));

    openBoots.push(boot);
    dock.scripted = scriptedChild(running);

    await boot.engineHost.start(aGatewayServing());
    await writeFile(
      join(home, 'accounts.json'),
      JSON.stringify({
        schemaVersion: ACCOUNTS_VERSION,
        accounts: [
          {
            id: 'sub-1',
            provider: 'anthropic',
            kind: 'subscription',
            label: 'Personal',
            provenance: 'sign-in',
          },
        ],
      }),
    );

    const stamped = await eventually(async () => {
      dock.scripted?.send({ kind: 'log', row: aSettledRow(`log-${String(Date.now())}`, 'sub-1') });

      return aStampedBucket(boot);
    });

    expect(stamped.tuple.accountKind).toBe('subscription');
  });
});

describe('the plan readings the stored profile holds', () => {
  test('a boot that heard no vendor answer holds no readings at all', async () => {
    const boot = await bootFromStoredState(depsOver(await aQuietHome()));

    openBoots.push(boot);

    expect(boot.planUsage()).toEqual({});
  });

  test('a reading the child speaks stands under its account until a newer one lands', async () => {
    const boot = await bootFromStoredState(depsOver(await aQuietHome()));

    openBoots.push(boot);
    dock.scripted = scriptedChild(running);

    await boot.engineHost.start(aGatewayServing());
    dock.scripted.send(aPlanRead(0.4));
    dock.scripted.send(aPlanRead(0.7));

    expect(boot.planUsage()).toEqual({ 'sub-1': aPlanReading(0.7) });
  });

  test('a share the last launch stored stands again at the next boot', async () => {
    const home = await aQuietHome();

    await storedPlanUsage(home, { 'sub-1': aPlanReading(0.4) });

    const boot = await bootFromStoredState(depsOver(home));

    openBoots.push(boot);

    expect(boot.planUsage()).toEqual({ 'sub-1': aPlanReading(0.4) });
  });

  test('a stored window that turned over while the app was closed stays off the page', async () => {
    const home = await aQuietHome();

    await storedPlanUsage(home, {
      'sub-1': {
        ...aPlanReading(0.4),
        windows: [{ length: '5h', spentShare: 0.4, resetsAt: RESET_LONG_AGO }],
      },
    });

    const boot = await bootFromStoredState(depsOver(home));

    openBoots.push(boot);

    expect(boot.planUsage()).toEqual({});
  });

  test('a reading the child speaks reaches the disk once the gateway stops', async () => {
    const home = await aQuietHome();
    const boot = await bootFromStoredState(depsOver(home));

    openBoots.push(boot);
    dock.scripted = scriptedChild(running);

    await boot.engineHost.start(aGatewayServing());
    dock.scripted.send(aPlanRead(0.7));
    await boot.engineHost.stop('codex');

    expect(await eventually(async () => storedPlanReadings(home))).toEqual({
      'sub-1': aPlanReading(0.7),
    });
  });
});
