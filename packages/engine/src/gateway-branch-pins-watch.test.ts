import { describe, expect, test } from 'vitest';

import type { BranchPinTallyReading } from './gateway-branch-pins-watch';
import type { RouteNodeAddress } from './routing/route-node-key';

import { publishBranchPinTally, subscribeToBranchPinTallies } from './gateway-branch-pins-watch';

const LADDER: RouteNodeAddress = { slug: 'personal', virtualModel: 'fast', routeNode: 'ladder' };

describe('who hears what a router is holding', () => {
  test('a reader hears the router named and the branches counted', () => {
    const heard: BranchPinTallyReading[] = [];
    const letGo = subscribeToBranchPinTallies((reading) => {
      heard.push(reading);
    });

    publishBranchPinTally(LADDER, { coder: 2 });
    letGo();

    expect(heard).toEqual([{ address: LADDER, pinned: { coder: 2 } }]);
  });

  test('a reader that let go hears nothing further, so no listener outlives its subscriber', () => {
    const heard: BranchPinTallyReading[] = [];
    const letGo = subscribeToBranchPinTallies((reading) => {
      heard.push(reading);
    });

    letGo();
    publishBranchPinTally(LADDER, { coder: 1 });

    expect(heard).toEqual([]);
  });

  test('a reader that breaks never keeps the next one from hearing', () => {
    const heard: BranchPinTallyReading[] = [];
    const letBrokenGo = subscribeToBranchPinTallies(() => {
      throw new Error('this reader is gone');
    });
    const letGo = subscribeToBranchPinTallies((reading) => {
      heard.push(reading);
    });

    publishBranchPinTally(LADDER, { talker: 1 });
    letBrokenGo();
    letGo();

    expect(heard).toEqual([{ address: LADDER, pinned: { talker: 1 } }]);
  });
});
