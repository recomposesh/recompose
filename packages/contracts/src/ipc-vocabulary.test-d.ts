import { describe, expectTypeOf, test } from 'vitest';

import type { IpcChannel, IpcEvent } from './index';

type AccountChannel =
  | 'accounts:list'
  | 'accounts:connect'
  | 'accounts:remove'
  | 'accounts:check-key'
  | 'accounts:set-reader-key'
  | 'accounts:clear-reader-key'
  | 'accounts:connect-local'
  | 'accounts:detect-runtime'
  | 'accounts:check-runtime'
  | 'accounts:move-runtime'
  | 'accounts:list-models';

describe('the account channel vocabulary', () => {
  test('every channel an account travels is exactly these, so an unlisted one arrives red', () => {
    expectTypeOf<Extract<IpcChannel, `accounts:${string}`>>().toEqualTypeOf<AccountChannel>();
  });
});

describe('the channel vocabulary', () => {
  test('the surface is exactly these channels, so an unlisted one arrives red', () => {
    expectTypeOf<IpcChannel>().toEqualTypeOf<
      | AccountChannel
      | 'gateways:list'
      | 'gateways:save'
      | 'gateways:update'
      | 'gateways:remove'
      | 'gateways:set-port'
      | 'gateways:offer-port'
      | 'gateways:move-port'
      | 'settings:get'
      | 'settings:save'
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
  test('the state, traffic, pin, cooldown, judging, logs, account-change, and command pushes are the complete vocabulary', () => {
    expectTypeOf<IpcEvent>().toEqualTypeOf<
      | 'engine:state'
      | 'engine:traffic'
      | 'engine:pins'
      | 'engine:cooldowns'
      | 'engine:judging'
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
