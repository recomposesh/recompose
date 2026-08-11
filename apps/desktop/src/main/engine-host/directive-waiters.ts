import type { GatewayEngineState } from '@recompose/contracts';

export type Waiter = {
  answer: (state: GatewayEngineState) => void;
  refuse: (reason: Error) => void;
};

/**
 * Refuses every directive still waiting on a report, for one shared reason.
 *
 * @summary The map empties before the first refusal lands, so a waiter that reacts by sending a
 * fresh directive never sees its new wait swept up with the dead ones.
 */
export function refuseEveryWaiter(awaitingReport: Map<string, Waiter>, reason: Error): void {
  const waiting = [...awaitingReport.values()];

  awaitingReport.clear();

  for (const waiter of waiting) {
    waiter.refuse(reason);
  }
}
