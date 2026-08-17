import type {
  IpcEvent,
  IpcEventPayload,
  IpcRequest,
  IpcResponse,
  RecomposeIpc,
  RecomposeIpcEvents,
} from '@recompose/contracts';

import { contextBridge, ipcRenderer } from 'electron';

function bridgeEntry<Channel extends keyof RecomposeIpc>(channel: Channel) {
  return async (request: IpcRequest<Channel>): Promise<IpcResponse<Channel>> =>
    ipcRenderer.invoke(channel, request);
}

function eventEntry<Event extends IpcEvent>(event: Event) {
  return (listener: (payload: IpcEventPayload<Event>) => void) => {
    const handler = (_sent: unknown, payload: IpcEventPayload<Event>): void => {
      listener(payload);
    };

    ipcRenderer.on(event, handler);

    return () => {
      ipcRenderer.off(event, handler);
    };
  };
}

const recompose: RecomposeIpc = Object.freeze({
  'gateways:list': bridgeEntry('gateways:list'),
  'gateways:save': bridgeEntry('gateways:save'),
  'gateways:update': bridgeEntry('gateways:update'),
  'gateways:remove': bridgeEntry('gateways:remove'),
  'settings:get': bridgeEntry('settings:get'),
  'settings:save': bridgeEntry('settings:save'),
  'accounts:list': bridgeEntry('accounts:list'),
  'accounts:connect': bridgeEntry('accounts:connect'),
  'accounts:remove': bridgeEntry('accounts:remove'),
  'accounts:check-key': bridgeEntry('accounts:check-key'),
  'accounts:connect-local': bridgeEntry('accounts:connect-local'),
  'accounts:detect-runtime': bridgeEntry('accounts:detect-runtime'),
  'accounts:check-runtime': bridgeEntry('accounts:check-runtime'),
  'accounts:move-runtime': bridgeEntry('accounts:move-runtime'),
  'accounts:list-models': bridgeEntry('accounts:list-models'),
  'system:get': bridgeEntry('system:get'),
  'system:open-config-folder': bridgeEntry('system:open-config-folder'),
  'system:window-band': bridgeEntry('system:window-band'),
  'system:title-bar-double-click': bridgeEntry('system:title-bar-double-click'),
  'gateways:offer-port': bridgeEntry('gateways:offer-port'),
  'gateways:move-port': bridgeEntry('gateways:move-port'),
  'gateways:set-port': bridgeEntry('gateways:set-port'),
  'engine:start': bridgeEntry('engine:start'),
  'engine:stop': bridgeEntry('engine:stop'),
  'engine:states': bridgeEntry('engine:states'),
  'engine:replay-logs': bridgeEntry('engine:replay-logs'),
  'system:logs-drawer': bridgeEntry('system:logs-drawer'),
  'system:surface-toggles': bridgeEntry('system:surface-toggles'),
  'usage:report': bridgeEntry('usage:report'),
  'usage:quota-windows': bridgeEntry('usage:quota-windows'),
  'usage:balances': bridgeEntry('usage:balances'),
  'system:usage-table': bridgeEntry('system:usage-table'),
  'updates:get': bridgeEntry('updates:get'),
  'updates:restart': bridgeEntry('updates:restart'),
  'subscriptions:list': bridgeEntry('subscriptions:list'),
  'subscriptions:tools': bridgeEntry('subscriptions:tools'),
  'subscriptions:sign-in': bridgeEntry('subscriptions:sign-in'),
  'subscriptions:device-code': bridgeEntry('subscriptions:device-code'),
  'subscriptions:device-await': bridgeEntry('subscriptions:device-await'),
  'subscriptions:browser-sign-in': bridgeEntry('subscriptions:browser-sign-in'),
  'subscriptions:restore': bridgeEntry('subscriptions:restore'),
  'subscriptions:activate': bridgeEntry('subscriptions:activate'),
  'subscriptions:detect': bridgeEntry('subscriptions:detect'),
  'subscriptions:adopt': bridgeEntry('subscriptions:adopt'),
});

const recomposeEvents: RecomposeIpcEvents = Object.freeze({
  'engine:state': eventEntry('engine:state'),
  'engine:traffic': eventEntry('engine:traffic'),
  'engine:logs': eventEntry('engine:logs'),
  'accounts:changed': eventEntry('accounts:changed'),
  'canvas:command': eventEntry('canvas:command'),
  'usage:command': eventEntry('usage:command'),
  'view:command': eventEntry('view:command'),
  'updates:changed': eventEntry('updates:changed'),
  'settings:changed': eventEntry('settings:changed'),
  'devtools:toggle': eventEntry('devtools:toggle'),
  'subscriptions:launch-refused': eventEntry('subscriptions:launch-refused'),
});

contextBridge.exposeInMainWorld('recompose', recompose);
contextBridge.exposeInMainWorld('recomposeEvents', recomposeEvents);
