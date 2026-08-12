import { z } from 'zod';

import { accountsDocumentSchema, credentialedAccountKindSchema } from './accounts';
import { keyCheckReportSchema, pastedKeySchema } from './api-keys';
import { logBatchSchema } from './engine-logs';
import { modelListingSchema } from './engine-protocol';
import { engineStatesSchema, gatewayEngineStateSchema } from './engine-state';
import { gatewayTrafficSchema } from './engine-traffic';
import { gatewayConfigSchema, gatewayPortSchema, gatewaySlugSchema } from './gateway-config';
import {
  localRuntimeIdSchema,
  runtimePortSchema,
  runtimeReachabilitySchema,
} from './local-runtimes';
import { nonBlankString } from './non-blank';
import { settingsPatchSchema, settingsSchema } from './settings';
import {
  subscriptionAccountViewSchema,
  subscriptionProviderIdSchema,
  subscriptionToolSchema,
} from './subscriptions';
import {
  accountBalanceSchema,
  quotaWindowSchema,
  usageReportAskSchema,
  usageReportSchema,
} from './usage';

export const ipcErrorSchema = z.strictObject({
  code: z.enum([
    'vault-unavailable',
    'vault-newer-schema',
    'settings-newer-schema',
    'accounts-newer-schema',
    'usage-newer-schema',
    'validation-failed',
    'storage-failed',
    'folder-open-failed',
    'name-conflict',
    'port-conflict',
    'tool-missing',
    'sign-in-timed-out',
    'keychain-denied',
  ]),
  message: z.string().min(1),
});

export type IpcError = z.infer<typeof ipcErrorSchema>;

export function ipcResult<Value extends z.ZodType>(value: Value) {
  return z.union([
    z.strictObject({ ok: z.literal(true), value }),
    z.strictObject({ ok: z.literal(false), error: ipcErrorSchema }),
  ]);
}

export const connectAccountRequestSchema = z.strictObject({
  provider: nonBlankString,
  kind: credentialedAccountKindSchema,
  label: z.string().trim().min(1),
  secret: pastedKeySchema,
});

const subscriptionViewsResponse = ipcResult(z.array(subscriptionAccountViewSchema));

export const systemStateSchema = z.strictObject({
  fileBrowser: z.enum(['finder', 'explorer', 'file-manager']),
  loginItem: z.enum(['available', 'unpackaged', 'unsupported']),
  loginItemEnabled: z.boolean(),
  menuBarVisible: z.boolean(),
  configFolder: nonBlankString,
});

export type SystemState = z.infer<typeof systemStateSchema>;

export const ipcChannels = {
  'gateways:list': { request: z.void(), response: ipcResult(z.array(gatewayConfigSchema)) },
  'gateways:save': {
    request: gatewayConfigSchema,
    response: ipcResult(z.array(gatewayConfigSchema)),
  },
  'gateways:update': {
    request: gatewayConfigSchema,
    response: ipcResult(z.array(gatewayConfigSchema)),
  },
  'gateways:remove': {
    request: z.strictObject({ slug: gatewaySlugSchema }),
    response: ipcResult(z.array(gatewayConfigSchema)),
  },
  'settings:get': { request: z.void(), response: ipcResult(settingsSchema) },
  'settings:save': { request: settingsPatchSchema, response: ipcResult(settingsSchema) },
  'accounts:list': { request: z.void(), response: ipcResult(accountsDocumentSchema) },
  'accounts:connect': {
    request: connectAccountRequestSchema,
    response: ipcResult(accountsDocumentSchema),
  },
  'accounts:remove': {
    request: z.strictObject({ id: nonBlankString }),
    response: ipcResult(accountsDocumentSchema),
  },
  'accounts:check-key': {
    request: z.strictObject({ id: nonBlankString }),
    response: ipcResult(keyCheckReportSchema),
  },
  'accounts:connect-local': {
    request: z.strictObject({ runtime: localRuntimeIdSchema, port: runtimePortSchema.optional() }),
    response: ipcResult(accountsDocumentSchema),
  },
  'accounts:detect-runtime': {
    request: z.strictObject({ runtime: localRuntimeIdSchema, port: runtimePortSchema.optional() }),
    response: ipcResult(runtimeReachabilitySchema),
  },
  'accounts:check-runtime': {
    request: z.strictObject({ id: nonBlankString }),
    response: ipcResult(runtimeReachabilitySchema),
  },
  'accounts:list-models': {
    request: z.strictObject({ id: nonBlankString }),
    response: ipcResult(modelListingSchema),
  },
  'system:get': { request: z.void(), response: ipcResult(systemStateSchema) },
  'system:open-config-folder': { request: z.void(), response: ipcResult(z.void()) },
  'system:window-band': { request: z.enum(['sidebar', 'toolbar']), response: ipcResult(z.void()) },
  'system:title-bar-double-click': { request: z.void(), response: ipcResult(z.void()) },
  'gateways:offer-port': { request: z.void(), response: ipcResult(gatewayPortSchema) },
  'gateways:move-port': {
    request: z.strictObject({ slug: gatewaySlugSchema }),
    response: ipcResult(z.array(gatewayConfigSchema)),
  },
  'gateways:set-port': {
    request: z.strictObject({ slug: gatewaySlugSchema, port: gatewayPortSchema }),
    response: ipcResult(z.array(gatewayConfigSchema)),
  },
  'engine:start': {
    request: z.strictObject({ slug: gatewaySlugSchema }),
    response: ipcResult(gatewayEngineStateSchema),
  },
  'engine:stop': {
    request: z.strictObject({ slug: gatewaySlugSchema }),
    response: ipcResult(gatewayEngineStateSchema),
  },
  'engine:states': { request: z.void(), response: ipcResult(engineStatesSchema) },
  /**
   * Asks main to send the retained request log again, for a renderer that just bound.
   *
   * @summary The rows come back on `engine:logs` as backfill runs rather than in this answer,
   * because a full history is 10,000 rows and one reply carrying them all is the giant message the
   * chunking exists to avoid. Every run merges by row id, so asking twice costs nothing.
   */
  'engine:replay-logs': { request: z.void(), response: ipcResult(z.void()) },
  'system:logs-drawer': {
    request: z.strictObject({ open: z.boolean() }),
    response: ipcResult(z.void()),
  },
  /**
   * Asks main for one range of closed usage buckets, priced at day width.
   *
   * @summary The answer carries tuple-keyed buckets whole and the renderer folds its own
   * group-bys, so no group-by parameter exists. The open bucket never rides the answer, which is
   * what keeps the live plane and the ledger from ever counting one request twice. A reader whose
   * window is narrower than the range's own width asks for hours, and a reader carries its day
   * boundary so a folded day breaks at the reader's midnight rather than at UTC.
   */
  'usage:report': {
    request: usageReportAskSchema,
    response: ipcResult(usageReportSchema),
  },
  'usage:quota-windows': {
    request: z.void(),
    response: ipcResult(z.array(quotaWindowSchema).readonly()),
  },
  'usage:balances': {
    request: z.strictObject({ refresh: z.boolean() }),
    response: ipcResult(z.array(accountBalanceSchema).readonly()),
  },
  'system:usage-table': {
    request: z.strictObject({ open: z.boolean() }),
    response: ipcResult(z.void()),
  },
  'subscriptions:list': { request: z.void(), response: subscriptionViewsResponse },
  'subscriptions:tools': {
    request: z.void(),
    response: ipcResult(z.array(subscriptionToolSchema)),
  },
  'subscriptions:sign-in': {
    request: z.strictObject({ provider: subscriptionProviderIdSchema }),
    response: subscriptionViewsResponse,
  },
  'subscriptions:restore': {
    request: z.strictObject({ id: nonBlankString }),
    response: subscriptionViewsResponse,
  },
  'subscriptions:activate': {
    request: z.strictObject({ id: nonBlankString }),
    response: subscriptionViewsResponse,
  },
} as const;

export type IpcChannel = keyof typeof ipcChannels;
export type IpcRequest<Channel extends IpcChannel> = z.infer<
  (typeof ipcChannels)[Channel]['request']
>;
export type IpcResponse<Channel extends IpcChannel> = z.infer<
  (typeof ipcChannels)[Channel]['response']
>;

export type RecomposeIpc = {
  [Channel in IpcChannel]: (request: IpcRequest<Channel>) => Promise<IpcResponse<Channel>>;
};

export const ipcEvents = {
  'engine:state': { payload: engineStatesSchema },
  'engine:traffic': { payload: gatewayTrafficSchema },
  'engine:logs': { payload: logBatchSchema },
  'accounts:changed': { payload: z.literal('changed') },
  'canvas:command': {
    payload: z.enum(['zoom-in', 'zoom-out', 'zoom-to-fit', 'tidy', 'toggle-logs']),
  },
  'usage:command': {
    payload: z.enum([
      'range-24h',
      'range-7d',
      'range-30d',
      'metric-requests',
      'metric-tokens',
      'metric-spend',
      'metric-latency',
      'metric-errors',
      'toggle-table-twin',
      'refresh',
    ]),
  },
  'settings:changed': { payload: settingsSchema },
  'devtools:toggle': { payload: z.literal('asked') },
} as const;

export type IpcEvent = keyof typeof ipcEvents;
export type IpcEventPayload<Event extends IpcEvent> = z.infer<(typeof ipcEvents)[Event]['payload']>;

export type RecomposeIpcEvents = {
  [Event in IpcEvent]: (listener: (payload: IpcEventPayload<Event>) => void) => () => void;
};
