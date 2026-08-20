import { TRAFFIC_PUSH_MS } from './traffic-ledger';

/** One reading the child spoke, named by the gateway, the virtual model, and the node it is about. */
export type RouteNodeFiling<Reading> = {
  slug: string;
  virtualModel: string;
  routeNode: string;
  reading: Reading;
};

/** Every reading of one kind, filed under the model and the gateway the node serves. */
export type FiledByRouteNode<Reading> = Record<string, Record<string, Record<string, Reading>>>;

export type RouteNodeDesk = {
  hears: (message: unknown) => boolean;
  forget: (slug: string) => void;
};

/**
 * Files one node's reading under the gateway and model holding it, replacing what stood there.
 *
 * @summary The child speaks a node's whole current reading rather than a change to it, so the entry
 * is replaced rather than merged. Merging would leave a reading nobody can retract standing forever,
 * since the way the child says a reading no longer holds is by speaking a newer one.
 */
function withReading<Reading>(
  filed: FiledByRouteNode<Reading>,
  filing: RouteNodeFiling<Reading>,
): FiledByRouteNode<Reading> {
  const held = filed[filing.slug];

  return {
    ...filed,
    [filing.slug]: {
      ...held,
      [filing.virtualModel]: {
        ...held?.[filing.virtualModel],
        [filing.routeNode]: filing.reading,
      },
    },
  };
}

/**
 * Holds what the child last said about every route node, and tells the windows in one word.
 *
 * @summary A busy gateway moves several nodes within a frame, and the windows are owed one snapshot
 * rather than one message per move, so every reading of this shape keeps the cadence traffic keeps.
 * The folding is shared because it is one piece of knowledge, not two that resemble each other: a
 * reading is filed under gateway, model, and node, and a gateway that stops takes its readings with
 * it, whether the reading counts conversations or says when a node stands back up.
 */
export function openRouteNodeDesk<Reading>(
  filingOf: (message: unknown) => RouteNodeFiling<Reading> | undefined,
  push: (filed: FiledByRouteNode<Reading>) => void,
): RouteNodeDesk {
  let filed: FiledByRouteNode<Reading> = {};
  let pending: ReturnType<typeof setTimeout> | null = null;

  const tellTheWindowsSoon = (): void => {
    if (pending !== null) {
      return;
    }

    pending = setTimeout(() => {
      pending = null;
      push(filed);
    }, TRAFFIC_PUSH_MS);
  };

  return {
    hears: (message) => {
      const filing = filingOf(message);

      if (filing === undefined) {
        return false;
      }

      filed = withReading(filed, filing);
      tellTheWindowsSoon();

      return true;
    },
    forget: (slug) => {
      if (filed[slug] === undefined) {
        return;
      }

      const remaining = { ...filed };

      delete remaining[slug];
      filed = remaining;
      tellTheWindowsSoon();
    },
  };
}
