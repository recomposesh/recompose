import {
  type EngineBranchPinReport,
  engineBranchPinReportSchema,
  type GatewayBranchPins,
} from '@recompose/contracts';

import { TRAFFIC_PUSH_MS } from './traffic-ledger';

export type BranchPinDesk = {
  hears: (message: unknown) => boolean;
  forget: (slug: string) => void;
};

/**
 * Files one router's counts under the gateway and model holding it, replacing what stood there.
 *
 * @summary The report carries that router's whole count rather than a change to it, so the entry is
 * replaced rather than merged. Merging would leave a branch that let its last conversation go
 * counting forever, since the way a branch says it holds nothing is by not appearing.
 */
function withTally(pinning: GatewayBranchPins, report: EngineBranchPinReport): GatewayBranchPins {
  const held = pinning[report.slug];

  return {
    ...pinning,
    [report.slug]: {
      ...held,
      [report.virtualModel]: {
        ...held?.[report.virtualModel],
        [report.routeNode]: report.pinned,
      },
    },
  };
}

type Desk = {
  pinning: GatewayBranchPins;
  pending: ReturnType<typeof setTimeout> | null;
};

function tellTheWindowsSoon(desk: Desk, push: (pinning: GatewayBranchPins) => void): void {
  if (desk.pending !== null) {
    return;
  }

  desk.pending = setTimeout(() => {
    desk.pending = null;
    push(desk.pinning);
  }, TRAFFIC_PUSH_MS);
}

/**
 * Holds what every conditional router is currently pinning and tells the windows in one word.
 *
 * @summary A gateway judging a burst of fresh conversations moves several routers within a frame,
 * and the windows are owed one snapshot rather than one message per judgment, so the cadence is the
 * one traffic already keeps.
 *
 * A gateway that stops is dropped whole rather than left standing, because the pins live in the
 * engine child's runtime memory and die with the gateway serving them. Counts kept past that would
 * tell a person conversations are held where nothing is.
 */
export function openBranchPinDesk(push: (pinning: GatewayBranchPins) => void): BranchPinDesk {
  const desk: Desk = { pinning: {}, pending: null };

  return {
    hears: (message) => {
      const report = engineBranchPinReportSchema.safeParse(message);

      if (!report.success) {
        return false;
      }

      desk.pinning = withTally(desk.pinning, report.data);
      tellTheWindowsSoon(desk, push);

      return true;
    },
    forget: (slug) => {
      if (desk.pinning[slug] === undefined) {
        return;
      }

      const remaining = { ...desk.pinning };

      delete remaining[slug];
      desk.pinning = remaining;
      tellTheWindowsSoon(desk, push);
    },
  };
}
