import { describe, expect, test } from 'vitest';

import { homeVendorItem, machineVendorItem } from './vendor-item';

const osUser = 'ada';

describe('which keychain item a Claude Code credential belongs to', () => {
  test("given the person's own install, the item carries the plain service name", () => {
    expect(machineVendorItem(osUser)).toEqual({
      service: 'Claude Code-credentials',
      account: osUser,
    });
  });

  test('given a config home the app created, the item carries a name of that home of its own', () => {
    const item = homeVendorItem('/Users/ada/.recompose/subscriptions/anthropic/pending', osUser);

    expect(item).toEqual({
      service: 'Claude Code-credentials-051e57fb',
      account: osUser,
    });
  });

  test('given two homes, each keeps an item the other never reaches', () => {
    const mine = homeVendorItem('/home/ada/one', osUser);
    const theirs = homeVendorItem('/home/ada/two', osUser);

    expect(mine.service).toBe('Claude Code-credentials-5b6e3a50');
    expect(theirs.service).toBe('Claude Code-credentials-9211bb2c');
  });

  test('given one home asked for twice, the item stands the same', () => {
    const home = '/home/ada/one';

    expect(homeVendorItem(home, osUser)).toEqual(homeVendorItem(home, osUser));
  });

  test("given a config home, its item is never the one the person's own install uses", () => {
    expect(homeVendorItem('/home/ada/one', osUser).service).not.toBe(
      machineVendorItem(osUser).service,
    );
  });
});
