import { describe, expectTypeOf, test } from 'vitest';

import type { IpcChannel, IpcEvent } from './index';

describe('the channel vocabulary', () => {
  test('the surface is exactly these thirty-nine channels, so a fortieth arrives red', () => {
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
      | 'usage:report'
      | 'usage:quota-windows'
      | 'usage:balances'
      | 'system:usage-table'
      | 'subscriptions:list'
      | 'subscriptions:tools'
      | 'subscriptions:sign-in'
      | 'subscriptions:copilot-code'
      | 'subscriptions:copilot-await'
      | 'subscriptions:restore'
      | 'subscriptions:activate'
      | 'subscriptions:detect'
      | 'subscriptions:adopt'
    >();
  });
});

describe('the push vocabulary', () => {
  test('the state, traffic, logs, account-change, and command pushes are the complete vocabulary', () => {
    expectTypeOf<IpcEvent>().toEqualTypeOf<
      | 'engine:state'
      | 'engine:traffic'
      | 'engine:logs'
      | 'accounts:changed'
      | 'canvas:command'
      | 'usage:command'
      | 'settings:changed'
      | 'devtools:toggle'
      | 'subscriptions:launch-refused'
    >();
  });
});
