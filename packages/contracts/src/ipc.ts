import { z } from 'zod';

import {
  accountEndpointSchema,
  accountsDocumentSchema,
  credentialedAccountKindSchema,
} from './accounts';
import { keyCheckReportSchema, pastedKeySchema } from './api-keys';
import { logBatchSchema } from './engine-logs';
import { modelListingSchema } from './engine-protocol';
import { engineStatesSchema, gatewayEngineStateSchema } from './engine-state';
import { gatewayTrafficSchema } from './engine-traffic';
import { fileBrowserSchema } from './file-browser';
import { gatewayConfigSchema, gatewayPortSchema, gatewaySlugSchema } from './gateway-config';
import { ipcResult } from './ipc-result';
import { subscriptionChannels } from './ipc-subscriptions';
import {
  localProviderIdSchema,
  runtimePortSchema,
  runtimeReachabilitySchema,
} from './local-runtimes';
import { nonBlankString } from './non-blank';
import { settingsPatchSchema, settingsSchema } from './settings';
import { subscriptionProviderIdSchema } from './subscriptions';
import {
  accountBalanceSchema,
  quotaWindowSchema,
  usageReportAskSchema,
  usageReportSchema,
  usageSearchRangeSchema,
} from './usage';

export const connectAccountRequestSchema = z.strictObject({
  provider: nonBlankString,
  kind: credentialedAccountKindSchema,
  label: z.string().trim().min(1),
  secret: pastedKeySchema,
  endpoint: accountEndpointSchema.optional(),
});

/**
 * Whether a look at a server carries the port it needs.
 *
 * @summary A documented runtime falls back to the port its own project publishes. A server nobody
 * documents has no port to fall back to, so a request that names none would aim the look at
 * nothing.
 */
function namesItsOwnPort(asked: { runtime: string; port?: number | undefined }): boolean {
  return asked.runtime !== 'custom' || asked.port !== undefined;
}

export const systemStateSchema = z.strictObject({
  fileBrowser: fileBrowserSchema,
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
    request: z
      .strictObject({
        runtime: localProviderIdSchema,
        port: runtimePortSchema.optional(),
        label: z.string().trim().min(1).optional(),
      })
      .refine(namesItsOwnPort, 'a server nobody documents must name its own port')
      .refine(
        (asked) => asked.runtime !== 'custom' || asked.label !== undefined,
        'a server nobody documents must carry the name a person gave it',
      ),
    response: ipcResult(accountsDocumentSchema),
  },
  'accounts:detect-runtime': {
    request: z
      .strictObject({
        runtime: localProviderIdSchema,
        port: runtimePortSchema.optional(),
      })
      .refine(namesItsOwnPort, 'a server nobody documents must name its own port'),
    response: ipcResult(runtimeReachabilitySchema),
  },
  'accounts:check-runtime': {
    request: z.strictObject({ id: nonBlankString }),
    response: ipcResult(runtimeReachabilitySchema),
  },
  /**
   * Points a stored runtime at another port, without taking the row away and putting it back.
   *
   * @summary A server's port is not a fact about the row, it is where the server happens to answer
   * today, and a moved `OLLAMA_HOST` used to mean removing the row and adding it again. It names
   * the row rather than the runtime, because only a row has somewhere to move from, and it carries
   * a port rather than an address, because the app mints the address the same way an add does.
   */
  'accounts:move-runtime': {
    request: z.strictObject({ id: nonBlankString, port: runtimePortSchema }),
    response: ipcResult(accountsDocumentSchema),
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
  ...subscriptionChannels,
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
    payload: z.enum([
      'zoom-in',
      'zoom-out',
      'zoom-to-100',
      'zoom-to-fit',
      'tidy',
      'toggle-logs',
      'copy-base-url',
      'remove-gateway',
    ]),
  },
  /**
   * @summary The range members derive from the search vocabulary under the `range-` prefix, so a
   * range added to the address reaches the menu as a red build rather than a silent gap.
   */
  'usage:command': {
    payload: z.union([
      z.templateLiteral(['range-', usageSearchRangeSchema]),
      z.enum([
        'metric-requests',
        'metric-tokens',
        'metric-spend',
        'metric-latency',
        'toggle-table-twin',
        'refresh',
      ]),
    ]),
  },
  'settings:changed': { payload: settingsSchema },
  'devtools:toggle': { payload: z.literal('asked') },
  'subscriptions:launch-refused': {
    payload: z.strictObject({
      provider: subscriptionProviderIdSchema,
      note: nonBlankString,
    }),
  },
} as const;

export type IpcEvent = keyof typeof ipcEvents;
export type IpcEventPayload<Event extends IpcEvent> = z.infer<(typeof ipcEvents)[Event]['payload']>;

export type RecomposeIpcEvents = {
  [Event in IpcEvent]: (listener: (payload: IpcEventPayload<Event>) => void) => () => void;
};
