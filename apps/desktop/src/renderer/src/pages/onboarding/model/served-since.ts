import type { GatewayTraffic } from '@recompose/contracts';

/**
 * When the gateway last answered a request well, or nothing where it never has.
 *
 * @summary The wait reads this rather than the profile's first-served flag, because that flag
 * latches once for the life of a profile and setup can run again from the View menu. A person who
 * reopened setup and sent a request would otherwise wait forever on a latch that had already
 * fired years earlier.
 *
 * A moment rather than a count, because the traffic snapshot carries the last outcome per node and
 * never a history, so what a second request leaves behind is a newer moment on the same node.
 */
export function lastServedAt(traffic: GatewayTraffic, slug: string): number | undefined {
  const moments = servedMoments(traffic, slug);

  return moments.length === 0 ? undefined : Math.max(...moments);
}

function servedMoments(traffic: GatewayTraffic, slug: string): number[] {
  return Object.values(traffic[slug] ?? {}).flatMap((nodes) =>
    Object.values(nodes).reduce<number[]>(
      (moments, outcome) => (outcome.outcome === 'served' ? [...moments, outcome.at] : moments),
      [],
    ),
  );
}

/**
 * Whether a request has been served since the wait began.
 *
 * @summary A gateway that had already served before the wait opened has to answer again, so the
 * moment is compared rather than merely read. Nothing served before and something served now is
 * the plain case, and it reads as an arrival too.
 */
export function servedSince(before: number | undefined, now: number | undefined): boolean {
  if (now === undefined) {
    return false;
  }

  return before === undefined || now > before;
}
