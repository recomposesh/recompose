import type { RouteNodeAddress } from './routing/route-node-key';

import { tellingReaders } from './provider/telemetry-feed';

export type JudgingReading = { address: RouteNodeAddress; judging: number };

export type JudgingListener = (reading: JudgingReading) => void;

const judgingListeners = new Set<JudgingListener>();

const inFlight = new Map<string, number>();

function keyOf(address: RouteNodeAddress): string {
  return `${address.slug}\0${address.virtualModel}\0${address.routeNode}`;
}

function said(address: RouteNodeAddress, judging: number): void {
  tellingReaders(judgingListeners, () => ({ address, judging }), 'judging reading');
}

/**
 * Hands every classification one router waits on to a reader, for as long as it wants them.
 *
 * @summary The readings ride a feed rather than a parameter threaded down the serving path, the way
 * the cooldowns and the branch counts already do, because nothing between a judge call and a screen
 * has any business knowing a window is watching.
 */
export function subscribeToJudging(listener: JudgingListener): () => void {
  judgingListeners.add(listener);

  return () => {
    judgingListeners.delete(listener);
  };
}

/**
 * Says that one router has begun waiting on its judge, and hands back the way to say it stopped.
 *
 * @summary The count is kept here rather than at either end, because the dispatch and the settle
 * are two moments in one async call and a screen that read them as independent would stop pulsing
 * while a second request was still waiting. Settling twice is harmless for the same reason: the
 * returned hand is spent once and every later call finds it already spent.
 *
 * Nothing about the request crosses. The reading names the router and a number, so a lane painted
 * for a person can never carry a tail the caller wrote or a label the judge answered.
 */
export function judgingBegan(address: RouteNodeAddress): () => void {
  const key = keyOf(address);
  const standing = (inFlight.get(key) ?? 0) + 1;
  let spent = false;

  inFlight.set(key, standing);
  said(address, standing);

  return () => {
    if (spent) return;

    spent = true;

    const left = Math.max(0, (inFlight.get(key) ?? 1) - 1);

    if (left === 0) {
      inFlight.delete(key);
    } else {
      inFlight.set(key, left);
    }

    said(address, left);
  };
}

/** Forgets every router this process was watching, so one scenario never reads another's count. */
export function forgetJudgingInFlight(): void {
  inFlight.clear();
}
