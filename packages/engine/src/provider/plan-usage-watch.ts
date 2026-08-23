import type { PlanUsageReading } from '@recompose/contracts';

import { tellingReaders } from './telemetry-feed';

export type PlanUsageListener = (reading: PlanUsageReading) => void;

const planListeners = new Set<PlanUsageListener>();

/**
 * Hands every reading a vendor answered with to a reader, for as long as it wants them.
 *
 * @summary The feed sits under `provider/` rather than beside the other watches at the package
 * root, because the observability that publishes to it lives here, and a root module reaching back
 * into `provider/` would turn the one direction every other feed runs in. The reading names its
 * account, so one feed serves every gateway in the process without one account's plan ever drawing
 * another account's meter.
 */
export function subscribeToPlanUsage(listener: PlanUsageListener): () => void {
  planListeners.add(listener);

  return () => {
    planListeners.delete(listener);
  };
}

/**
 * Says what one account's plan reads, to whoever is listening.
 *
 * @summary A reader that throws is logged and stepped over, because a person waiting on an answer
 * must never pay for a screen that stopped reading, and a dropped reading costs nothing: the next
 * answer that account draws says the share again.
 */
export function publishPlanUsage(reading: PlanUsageReading): void {
  tellingReaders(planListeners, () => reading, 'plan usage reading');
}
