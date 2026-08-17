import { describe, expectTypeOf, test } from 'vitest';

import type { IpcError, IpcEventPayload, IpcRequest, IpcResponse, UpdateState } from './index';

type QuietUpdate = Extract<UpdateState, { standing: 'quiet' }>;
type DownloadingUpdate = Extract<UpdateState, { standing: 'downloading' }>;
type ReadyUpdate = Extract<UpdateState, { standing: 'ready' }>;

describe('the update state', () => {
  test('stands on exactly three arms', () => {
    expectTypeOf<UpdateState['standing']>().toEqualTypeOf<'quiet' | 'downloading' | 'ready'>();
  });

  test('only a moving update names a version', () => {
    expectTypeOf<QuietUpdate>().not.toHaveProperty('version');
    expectTypeOf<DownloadingUpdate['version']>().toEqualTypeOf<string>();
    expectTypeOf<ReadyUpdate['version']>().toEqualTypeOf<string>();
  });
});

describe('the update channels', () => {
  test('asking and restarting carry no payload', () => {
    expectTypeOf<IpcRequest<'updates:get'>>().toEqualTypeOf<void>();
    expectTypeOf<IpcRequest<'updates:restart'>>().toEqualTypeOf<void>();
  });

  test('the ask answers the whole state, and the push carries the same shape', () => {
    expectTypeOf<IpcResponse<'updates:get'>>().toExtend<
      { ok: true; value: UpdateState } | { ok: false; error: IpcError }
    >();
    expectTypeOf<IpcResponse<'updates:restart'>>().toExtend<
      { ok: true; value: void } | { ok: false; error: IpcError }
    >();
    expectTypeOf<IpcEventPayload<'updates:changed'>>().toEqualTypeOf<UpdateState>();
  });
});
