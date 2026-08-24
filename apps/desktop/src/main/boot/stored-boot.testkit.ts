import { join } from 'node:path';

import type { StoredBootDeps } from './stored-boot';

import { contextFor } from '../engine-host/spend-grant.testkit';

/**
 * The boot dependencies a story stands a profile up from, every reach pointed inside one home.
 *
 * @summary Both boot specs compose the same set, so it lives here rather than twice. The bundled
 * price files are named but never written: a story about booting says nothing about prices, and the
 * desk answers an unreadable snapshot with an empty layer rather than refusing the launch.
 */
export function depsOver(home: string, overrides: Partial<StoredBootDeps> = {}): StoredBootDeps {
  return {
    bundledPricesFile: join(home, 'bundled-prices.json'),
    bundledRegistryPricesFile: join(home, 'bundled-registry-prices.json'),
    legacyUserDataPath: join(home, 'legacy'),
    platform: 'linux',
    recomposeHome: () => home,
    onCorrupt: () => undefined,
    spendGrantContext: () => contextFor(home),
    reflectSettings: () => undefined,
    repaintStates: () => undefined,
    lifecycle: { reapply: () => undefined, stop: () => undefined },
    ...overrides,
  };
}
