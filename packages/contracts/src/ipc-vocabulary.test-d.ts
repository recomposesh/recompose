import { describe, expectTypeOf, test } from 'vitest';

import type { IpcChannel, IpcEvent } from './index';

describe('the channel vocabulary', () => {
  test('the surface is exactly these channels, so an unlisted one arrives red', () => {
    expectTypeOf<IpcChannel>().toEqualTypeOf<
      | 'gateways:list'
      | 'gateways:save'
      | 'gateways:update'
      | 'gateways:remove'
      | 'gateways:set-port'
      | 'gateways:offer-port'
      | 'gateways:move-port'
      | 'settings:get'
      | 'settings:save'
      | 'accounts:list'
      | 'accounts:connect'
      | 'accounts:remove'
      | 'accounts:check-key'
      | 'accounts:connect-local'
      | 'accounts:detect-runtime'
      | 'accounts:check-runtime'
      | 'accounts:move-runtime'
      | 'accounts:list-models'
      | 'system:get'
      | 'system:open-config-folder'
      | 'system:window-band'
      | 'system:title-bar-double-click'
      | 'engine:start'
      | 'engine:stop'
      | 'engine:states'
      | 'engine:replay-logs'
      | 'system:logs-drawer'
      | 'system:surface-toggles'
      | 'usage:report'
      | 'usage:quota-windows'
      | 'usage:balances'
      | 'system:usage-table'
      | 'updates:get'
      | 'updates:restart'
      | 'subscriptions:list'
      | 'subscriptions:tools'
      | 'subscriptions:sign-in'
      | 'subscriptions:device-code'
      | 'subscriptions:device-await'
      | 'subscriptions:browser-sign-in'
      | 'subscriptions:restore'
      | 'subscriptions:activate'
      | 'subscriptions:detect'
      | 'subscriptions:adopt'
    >();
  });
});

describe('the push vocabulary', () => {
  test('the state, traffic, pin, logs, account-change, and command pushes are the complete vocabulary', () => {
    expectTypeOf<IpcEvent>().toEqualTypeOf<
      | 'engine:state'
      | 'engine:traffic'
      | 'engine:pins'
      | 'engine:logs'
      | 'accounts:changed'
      | 'canvas:command'
      | 'usage:command'
      | 'view:command'
      | 'updates:changed'
      | 'settings:changed'
      | 'devtools:toggle'
      | 'subscriptions:launch-refused'
    >();
  });
});
