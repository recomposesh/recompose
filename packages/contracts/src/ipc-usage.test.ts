import { describe, expect, test } from 'vitest';

import { ipcChannels, ipcErrorSchema, ipcEvents } from './ipc';

describe('what the usage channels ask for', () => {
  test('a report read names its range', () => {
    expect(ipcChannels['usage:report'].request.parse({ range: '7d' })).toEqual({ range: '7d' });
    expect(() => ipcChannels['usage:report'].request.parse({ range: '90d' })).toThrow();
  });

  test('a report read may ask for hours where the default width would fold days', () => {
    expect(ipcChannels['usage:report'].request.parse({ range: '7d', bucketWidth: 'hour' })).toEqual(
      {
        range: '7d',
        bucketWidth: 'hour',
      },
    );
    expect(() =>
      ipcChannels['usage:report'].request.parse({ range: '7d', bucketWidth: 'minute' }),
    ).toThrow();
  });

  test('a report read carries the reader own day boundary, so days break where the reader lives', () => {
    expect(
      ipcChannels['usage:report'].request.parse({ range: '30d', dayOffsetMinutes: -180 }),
    ).toEqual({ range: '30d', dayOffsetMinutes: -180 });
    expect(() =>
      ipcChannels['usage:report'].request.parse({ range: '30d', dayOffsetMinutes: 1500 }),
    ).toThrow();
  });

  test('the quota read asks for nothing, because main derives every window it answers', () => {
    expect(ipcChannels['usage:quota-windows'].request.safeParse(undefined).success).toBe(true);
  });

  test('a balances read says whether it wants a fresh read or the cached one', () => {
    expect(ipcChannels['usage:balances'].request.parse({ refresh: true })).toEqual({
      refresh: true,
    });
  });

  test('the table twin reports its standing the way the logs drawer does', () => {
    expect(ipcChannels['system:usage-table'].request.parse({ open: true })).toEqual({ open: true });
  });

  test('a refused ledger read names the newer-schema code', () => {
    expect(
      ipcErrorSchema.parse({
        code: 'usage-newer-schema',
        message: 'The usage ledger was written by a newer recompose.',
      }).code,
    ).toBe('usage-newer-schema');
  });
});

describe('the usage menu command event', () => {
  const vocabulary = [
    'range-24h',
    'range-7d',
    'range-30d',
    'metric-requests',
    'metric-tokens',
    'metric-spend',
    'metric-latency',
    'toggle-table-twin',
    'refresh',
  ];

  test('every menu pick rides the command vocabulary the page understands', () => {
    for (const command of vocabulary) {
      expect(ipcEvents['usage:command'].payload.parse(command)).toBe(command);
    }
  });

  test('a command outside the vocabulary is refused', () => {
    expect(() => ipcEvents['usage:command'].payload.parse('range-90d')).toThrow();
    expect(() => ipcEvents['usage:command'].payload.parse('zoom-in')).toThrow();
  });

  test('the chart draws no error series, so no command asks it to', () => {
    expect(() => ipcEvents['usage:command'].payload.parse('metric-errors')).toThrow();
  });
});
