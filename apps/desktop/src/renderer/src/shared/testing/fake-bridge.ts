import type {
  AccountBalance,
  AccountsDocument,
  EngineStates,
  GatewayConfig,
  KeyCheckVerdict,
  MachineCredentialReading,
  QuotaWindow,
  RecomposeIpc,
  RecomposeIpcEvents,
  RuntimeReachability,
  Settings,
  SubscriptionAccountView,
  SubscriptionTool,
  SystemState,
  UsageReport,
} from '@recompose/contracts';

import { ACCOUNTS_VERSION, withSettingsPatch, defaultSettings } from '@recompose/contracts';

import { accountHandlers } from './fake-accounts';
import {
  forgetEngineLogsListeners,
  forgetEngineStateListeners,
  forgetEngineTrafficListeners,
  listenForEngineLogs,
  listenForEngineStates,
  listenForEngineTraffic,
} from './fake-engine-pushes';
import { gatewayHandlers } from './fake-gateways';
import { forgetLaunchRefusedListeners, listenForLaunchRefusals } from './fake-launch-refusals';
import { modelListHandlers, noModelLists, type SeededModelLists } from './fake-model-lists';
import { emitSettingsChanged, listenForSettingsChanges } from './fake-settings';
import { noSubscriptions, noTools, subscriptionHandlers } from './fake-subscriptions';
import { forgetUsageCommandListeners, listenForUsageCommands } from './fake-usage-pushes';
import {
  forgetReportedSurfaceToggles,
  forgetViewCommandListeners,
  listenForViewCommands,
  noteReportedSurfaceToggles,
} from './fake-view-pushes';

const emptyDocument: AccountsDocument = { schemaVersion: ACCOUNTS_VERSION, accounts: [] };

const observedSystem: SystemState = {
  fileBrowser: 'finder',
  loginItem: 'available',
  loginItemEnabled: false,
  menuBarVisible: false,
  configFolder: '~/Library/Application Support/recompose',
};

export type BridgeParameters = {
  accounts?: AccountsDocument;
  /** The verdict every key check answers, standing for what the provider says this run. */
  keyCheck?: KeyCheckVerdict;
  /** The reading every runtime look answers, standing for what the machine says this run. */
  reachability?: RuntimeReachability;
  settings?: Settings;
  /** The accounts whose model lists a look can read this run, and the ids each one serves. */
  providerModels?: SeededModelLists;
  gateways?: readonly GatewayConfig[];
  engineStates?: EngineStates;
  subscriptions?: readonly SubscriptionAccountView[];
  tools?: readonly SubscriptionTool[];
  /** What the provider's own tool left on this machine, standing for what a look would find. */
  machineReading?: MachineCredentialReading;
  /** The report every usage read answers, standing for what the ledger holds this run. */
  usageReport?: UsageReport;
  /** The windows the quota strip reads this run. */
  quotaWindows?: readonly QuotaWindow[];
  /** The balance cards the aggregator section reads this run. */
  balances?: readonly AccountBalance[];
  overrides?: Partial<RecomposeIpc>;
};

type SettingsHandlers = Pick<RecomposeIpc, 'settings:get' | 'settings:save'>;
type SystemHandlers = Pick<
  RecomposeIpc,
  | 'system:get'
  | 'system:open-config-folder'
  | 'system:window-band'
  | 'system:title-bar-double-click'
  | 'system:logs-drawer'
  | 'system:surface-toggles'
>;

function settingsHandlers(seed: Settings): SettingsHandlers {
  let stored = seed;

  return {
    'settings:get': async () => Promise.resolve({ ok: true, value: stored }),
    'settings:save': async (patch) => {
      stored = withSettingsPatch(stored, patch);
      emitSettingsChanged(stored);

      return Promise.resolve({ ok: true, value: stored });
    },
  };
}

function systemHandlers(): SystemHandlers {
  return {
    'system:get': async () => Promise.resolve({ ok: true, value: observedSystem }),
    'system:open-config-folder': async () => Promise.resolve({ ok: true, value: undefined }),
    'system:window-band': async () => Promise.resolve({ ok: true, value: undefined }),
    'system:title-bar-double-click': async () => Promise.resolve({ ok: true, value: undefined }),
    'system:logs-drawer': async () => Promise.resolve({ ok: true, value: undefined }),
    'system:surface-toggles': async (toggles) => {
      noteReportedSurfaceToggles(toggles);

      return Promise.resolve({ ok: true, value: undefined });
    },
  };
}

function eventBridge(): RecomposeIpcEvents {
  return {
    'engine:state': (listener) => listenForEngineStates(listener),
    'engine:traffic': (listener) => listenForEngineTraffic(listener),
    'engine:logs': (listener) => listenForEngineLogs(listener),
    'accounts:changed': () => () => undefined,
    'canvas:command': () => () => undefined,
    'usage:command': (listener) => listenForUsageCommands(listener),
    'view:command': (listener) => listenForViewCommands(listener),
    'updates:changed': () => () => undefined,
    'settings:changed': (listener) => listenForSettingsChanges(listener),
    'devtools:toggle': () => () => undefined,
    'subscriptions:launch-refused': (listener) => listenForLaunchRefusals(listener),
  };
}

function updatesHandlers(): Pick<RecomposeIpc, 'updates:get' | 'updates:restart'> {
  return {
    'updates:get': async () => Promise.resolve({ ok: true, value: { standing: 'quiet' } }),
    'updates:restart': async () => Promise.resolve({ ok: true, value: undefined }),
  };
}

const quietReport: UsageReport = {
  range: '24h',
  bucketWidth: 'hour',
  buckets: [],
  dayCosts: [],
  priceMisses: [],
  pricing: { source: 'bundled' },
};

type UsageHandlers = Pick<
  RecomposeIpc,
  'usage:report' | 'usage:quota-windows' | 'usage:balances' | 'system:usage-table'
>;

function usageHandlers(
  report: UsageReport,
  windows: readonly QuotaWindow[],
  balances: readonly AccountBalance[],
): UsageHandlers {
  return {
    'usage:report': async (request) =>
      Promise.resolve({ ok: true, value: { ...report, range: request.range } }),
    'usage:quota-windows': async () => Promise.resolve({ ok: true, value: windows }),
    'usage:balances': async () => Promise.resolve({ ok: true, value: balances }),
    'system:usage-table': async () => Promise.resolve({ ok: true, value: undefined }),
  };
}

const noGateways: readonly GatewayConfig[] = [];
const noWindows: readonly QuotaWindow[] = [];
const noBalances: readonly AccountBalance[] = [];
const noEngineStates: EngineStates = {};
const unreachableProvider: KeyCheckVerdict = 'could-not-check';
const silentRuntime: RuntimeReachability = { verdict: 'unreachable' };

function seedsFrom(parameters: BridgeParameters) {
  return {
    settings: defaultSettings(),
    accounts: emptyDocument,
    keyCheck: unreachableProvider,
    reachability: silentRuntime,
    providerModels: noModelLists,
    gateways: noGateways,
    engineStates: noEngineStates,
    subscriptions: noSubscriptions,
    tools: noTools,
    usageReport: quietReport,
    quotaWindows: noWindows,
    balances: noBalances,
    ...parameters,
  };
}

export function installFakeBridge(parameters: BridgeParameters = {}): void {
  const seeds = seedsFrom(parameters);

  forgetEngineStateListeners();
  forgetEngineTrafficListeners();
  forgetEngineLogsListeners();
  forgetUsageCommandListeners();
  forgetViewCommandListeners();
  forgetReportedSurfaceToggles();
  forgetLaunchRefusedListeners();

  const { landSubscription, ...accounts } = accountHandlers(
    seeds.accounts,
    seeds.keyCheck,
    seeds.reachability,
  );

  window.recompose = {
    ...settingsHandlers(seeds.settings),
    ...accounts,
    ...systemHandlers(),
    ...gatewayHandlers(seeds.gateways, seeds.engineStates),
    ...modelListHandlers(seeds.providerModels),
    ...subscriptionHandlers(
      seeds.subscriptions,
      seeds.tools,
      landSubscription,
      parameters.machineReading,
    ),
    ...usageHandlers(seeds.usageReport, seeds.quotaWindows, seeds.balances),
    ...updatesHandlers(),
    ...parameters.overrides,
  };
  window.recomposeEvents = eventBridge();
}
