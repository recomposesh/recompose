import { describe, expectTypeOf, test } from 'vitest';

import type { IpcRequest, IpcResponse } from './index';

describe('the channels the request log rides on', () => {
  test('asking for the log history again names nothing, because one desk holds every row', () => {
    expectTypeOf<IpcRequest<'engine:replay-logs'>>().toEqualTypeOf<void>();
  });

  test('the answer carries no rows, because they arrive on the push instead', () => {
    expectTypeOf<IpcResponse<'engine:replay-logs'>>().toExtend<
      { ok: true; value: void } | { ok: false }
    >();
  });

  test('asking for the live traffic again names nothing, because one desk holds the snapshot', () => {
    expectTypeOf<IpcRequest<'engine:replay-traffic'>>().toEqualTypeOf<void>();
  });

  test('the traffic answer carries no snapshot, because it arrives on the push instead', () => {
    expectTypeOf<IpcResponse<'engine:replay-traffic'>>().toExtend<
      { ok: true; value: void } | { ok: false }
    >();
  });

  test('the drawer standing crosses as the one fact the menu tick reads', () => {
    expectTypeOf<IpcRequest<'system:logs-drawer'>>().toEqualTypeOf<{ open: boolean }>();
  });
});
