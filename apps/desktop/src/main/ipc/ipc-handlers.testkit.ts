import type { AccountsDocument, Settings, SystemState, UsageReport } from '@recompose/contracts';

import { ACCOUNTS_VERSION, defaultSettings } from '@recompose/contracts';

import type { IpcHandlers } from './dispatch';

const emptyAccounts: AccountsDocument = { schemaVersion: ACCOUNTS_VERSION, accounts: [] };

const quietReport: UsageReport = {
  range: '24h',
  bucketWidth: 'hour',
  buckets: [],
  dayCosts: [],
  priceMisses: [],
  pricing: { source: 'bundled' },
};

const observedSystem: SystemState = {
  fileBrowser: 'finder',
  loginItem: 'available',
  loginItemEnabled: false,
  menuBarVisible: false,
  configFolder: '/tmp/recompose',
};

export const darkSettings: Settings = { ...defaultSettings(), theme: 'dark' };

const refuses = async (): Promise<never> => Promise.reject(new Error('not under test'));

/**
 * A whole handler desk where nothing answers, to be overridden one channel at a time.
 *
 * @summary One list of channels serves every spec that needs a full desk, so a new channel is
 * declared here once rather than in each of them, and a spec that forgot it cannot pass by
 * accident.
 */
type SubscriptionChannels = Pick<
  IpcHandlers,
  | 'subscriptions:list'
  | 'subscriptions:tools'
  | 'subscriptions:sign-in'
  | 'subscriptions:device-code'
  | 'subscriptions:device-await'
  | 'subscriptions:browser-sign-in'
  | 'subscriptions:restore'
  | 'subscriptions:activate'
  | 'subscriptions:detect'
>;

function succeedingSubscriptions(): SubscriptionChannels {
  const nothingHeld = async () => Promise.resolve({ ok: true as const, value: [] });

  return {
    'subscriptions:list': nothingHeld,
    'subscriptions:tools': nothingHeld,
    'subscriptions:sign-in': nothingHeld,
    'subscriptions:device-code': async () =>
      Promise.resolve({
        ok: true as const,
        value: { userCode: 'ABCD-1234', verificationUri: 'https://github.com/login/device' },
      }),
    'subscriptions:device-await': nothingHeld,
    'subscriptions:browser-sign-in': nothingHeld,
    'subscriptions:restore': nothingHeld,
    'subscriptions:activate': nothingHeld,
    'subscriptions:detect': async () =>
      Promise.resolve({ ok: true as const, value: { holds: 'nothing' as const } }),
  };
}

export function handlersWith(overrides: Partial<IpcHandlers>): IpcHandlers {
  return {
    'gateways:list': refuses,
    'gateways:save': refuses,
    'gateways:update': refuses,
    'gateways:remove': refuses,
    'gateways:set-port': refuses,
    'settings:get': refuses,
    'settings:save': refuses,
    'accounts:list': refuses,
    'accounts:connect': refuses,
    'accounts:remove': refuses,
    'accounts:check-key': refuses,
    'accounts:connect-local': refuses,
    'accounts:detect-runtime': refuses,
    'accounts:check-runtime': refuses,
    'accounts:move-runtime': refuses,
    'accounts:list-models': refuses,
    'system:get': refuses,
    'system:open-config-folder': refuses,
    'system:window-band': refuses,
    'system:title-bar-double-click': refuses,
    'system:logs-drawer': refuses,
    'gateways:offer-port': refuses,
    'gateways:move-port': refuses,
    'engine:start': refuses,
    'engine:stop': refuses,
    'engine:states': refuses,
    'engine:replay-logs': refuses,
    'usage:report': refuses,
    'usage:quota-windows': refuses,
    'usage:balances': refuses,
    'system:usage-table': refuses,
    'subscriptions:list': refuses,
    'subscriptions:tools': refuses,
    'subscriptions:sign-in': refuses,
    'subscriptions:device-code': refuses,
    'subscriptions:device-await': refuses,
    'subscriptions:browser-sign-in': refuses,
    'subscriptions:restore': refuses,
    'subscriptions:activate': refuses,
    'subscriptions:detect': refuses,
    'subscriptions:adopt': refuses,
    ...overrides,
  };
}

/** A whole handler desk where every channel answers the emptiest thing its contract allows. */
export function alwaysSucceedingHandlers(): IpcHandlers {
  const noGateways = async () => Promise.resolve({ ok: true as const, value: [] });
  const theseAccounts = async () => Promise.resolve({ ok: true as const, value: emptyAccounts });
  const theseSettings = async () => Promise.resolve({ ok: true as const, value: darkSettings });
  const nothing = async () => Promise.resolve({ ok: true as const, value: undefined });
  const silentRuntime = async () =>
    Promise.resolve({ ok: true as const, value: { verdict: 'unreachable' as const } });

  return {
    'gateways:list': noGateways,
    'gateways:save': noGateways,
    'gateways:update': noGateways,
    'gateways:remove': noGateways,
    'gateways:move-port': noGateways,
    'gateways:set-port': noGateways,
    'settings:get': theseSettings,
    'settings:save': theseSettings,
    'accounts:list': theseAccounts,
    'accounts:connect': theseAccounts,
    'accounts:remove': theseAccounts,
    'accounts:connect-local': theseAccounts,
    'accounts:check-key': async () =>
      Promise.resolve({ ok: true, value: { verdict: 'could-not-check' as const } }),
    'accounts:detect-runtime': silentRuntime,
    'accounts:check-runtime': silentRuntime,
    'accounts:move-runtime': theseAccounts,
    'accounts:list-models': async () =>
      Promise.resolve({ ok: true, value: { standing: 'unlisted' as const } }),
    'system:get': async () => Promise.resolve({ ok: true, value: observedSystem }),
    'system:open-config-folder': nothing,
    'system:window-band': nothing,
    'system:title-bar-double-click': nothing,
    'system:logs-drawer': nothing,
    'gateways:offer-port': async () => Promise.resolve({ ok: true, value: 51234 }),
    'engine:start': async () => Promise.resolve({ ok: true, value: { status: 'running' } }),
    'engine:stop': async () => Promise.resolve({ ok: true, value: { status: 'stopped' } }),
    'engine:states': async () => Promise.resolve({ ok: true, value: {} }),
    'engine:replay-logs': nothing,
    'usage:report': async () => Promise.resolve({ ok: true, value: quietReport }),
    'usage:quota-windows': noGateways,
    'usage:balances': noGateways,
    'system:usage-table': nothing,
    ...succeedingSubscriptions(),
    'subscriptions:adopt': noGateways,
  };
}
