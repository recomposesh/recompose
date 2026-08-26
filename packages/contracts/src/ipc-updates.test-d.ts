import { describe, expectTypeOf, test } from 'vitest';

import type {
  IpcError,
  IpcEventPayload,
  IpcRequest,
  IpcResponse,
  UpdateCheck,
  UpdateState,
} from './index';

type QuietUpdate = Extract<UpdateState, { standing: 'quiet' }>;
type DownloadingUpdate = Extract<UpdateState, { standing: 'downloading' }>;
type ReadyUpdate = Extract<UpdateState, { standing: 'ready' }>;

type AskingCheck = Extract<UpdateCheck, { standing: 'asking' }>;
type CurrentCheck = Extract<UpdateCheck, { standing: 'current' }>;
type FoundCheck = Extract<UpdateCheck, { standing: 'found' }>;
type FailedCheck = Extract<UpdateCheck, { standing: 'failed' }>;

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

describe('the check a person asked for', () => {
  test('stands on exactly four arms', () => {
    expectTypeOf<UpdateCheck['standing']>().toEqualTypeOf<
      'asking' | 'current' | 'found' | 'failed'
    >();
  });

  test('only a refused check names a reason, and only a fruitful one names a version', () => {
    expectTypeOf<AskingCheck>().not.toHaveProperty('reason');
    expectTypeOf<CurrentCheck>().not.toHaveProperty('version');
    expectTypeOf<FoundCheck['version']>().toEqualTypeOf<string>();
    expectTypeOf<FailedCheck['reason']>().toEqualTypeOf<string>();
  });

  test('any standing may carry a report, and none has to', () => {
    expectTypeOf<QuietUpdate['check']>().toEqualTypeOf<UpdateCheck | undefined>();
    expectTypeOf<DownloadingUpdate['check']>().toEqualTypeOf<UpdateCheck | undefined>();
    expectTypeOf<ReadyUpdate['check']>().toEqualTypeOf<UpdateCheck | undefined>();
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
