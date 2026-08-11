import { describe, expect, test } from 'vitest';

import { ipcFailure, storageFailure } from './storage-envelope';

describe('a refusal on its way to the screen', () => {
  test('a refusal arriving without words is given the stock explanation', () => {
    expect(ipcFailure('storage-failed', '')).toEqual({
      ok: false,
      error: { code: 'storage-failed', message: 'storage operation failed' },
    });
  });

  test('a refusal arriving with words keeps every one of them', () => {
    expect(ipcFailure('port-conflict', 'codex already holds this port.')).toEqual({
      ok: false,
      error: { code: 'port-conflict', message: 'codex already holds this port.' },
    });
  });
});

describe('a storage failure on its way to the screen', () => {
  test('a thrown value that is no error at all reads as the stock explanation', () => {
    expect(storageFailure('the disk left', '/Users/ada')).toEqual({
      ok: false,
      error: { code: 'storage-failed', message: 'storage operation failed' },
    });
  });

  test('an error naming a file under the home carries the shorthand instead of the account name', () => {
    const failed = storageFailure(
      new Error('ENOENT: no such file, open /Users/ada/.recompose/accounts.json'),
      '/Users/ada',
    );

    expect(failed).toEqual({
      ok: false,
      error: {
        code: 'storage-failed',
        message: 'ENOENT: no such file, open ~/.recompose/accounts.json',
      },
    });
  });
});
