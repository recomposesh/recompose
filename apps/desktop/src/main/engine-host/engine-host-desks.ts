import type { EngineGateway } from '@recompose/contracts';

import type { BranchPinDesk } from './branch-pins-ledger';
import type { CooldownDesk } from './cooldowns-ledger';
import type { EngineHostDeps } from './engine-host-types';
import type { JudgingDesk } from './judging-ledger';
import type { LogsDesk } from './logs-ledger';
import type { TrafficDesk } from './traffic-ledger';

import { openBranchPinDesk } from './branch-pins-ledger';
import { openCooldownDesk } from './cooldowns-ledger';
import { openJudgingDesk } from './judging-ledger';
import { openLogsDesk } from './logs-ledger';
import { openTrafficDesk } from './traffic-ledger';

/**
 * The desks that fold what the child says on its own into what the windows are told.
 *
 * @summary They stand together because every one of them answers the same four moments in a
 * gateway's life, and a caller that had to remember each by name would eventually tell three of
 * them a gateway stopped and forget the fourth.
 */
export type EngineDesks = {
  traffic: TrafficDesk;
  pins: BranchPinDesk;
  cooling: CooldownDesk;
  judging: JudgingDesk;
  logs: LogsDesk;
};

/** The handler a desk pushes through, or one that pushes nowhere when the host wired none. */
function pushingTo<Reading>(handler: ((reading: Reading) => void) | undefined) {
  return handler ?? ((): void => undefined);
}

export function openEngineDesks(deps: EngineHostDeps): EngineDesks {
  return {
    traffic: openTrafficDesk(pushingTo(deps.onTraffic)),
    pins: openBranchPinDesk(pushingTo(deps.onBranchPins)),
    cooling: openCooldownDesk(pushingTo(deps.onCooldowns)),
    judging: openJudgingDesk(pushingTo(deps.onJudging)),
    logs: openLogsDesk(pushingTo(deps.onLogs), deps.onSettledRow),
  };
}

export function aDeskHeardIt(desks: EngineDesks, message: unknown): boolean {
  return (
    desks.traffic.hears(message) ||
    desks.pins.hears(message) ||
    desks.cooling.hears(message) ||
    desks.judging.hears(message) ||
    desks.logs.hears(message)
  );
}

/**
 * Settles every desk on a gateway that stopped serving without finishing what it was doing.
 *
 * @summary Traffic and logs each hold a request still in flight and answer for it, while the pins
 * and the cooling are simply gone: the branch a conversation earned and the window a refused call
 * bought both lived in the engine child's memory and stopped with it, so anything kept here would
 * say conversations are held and judges are out where a fresh child stands every node ready.
 */
export function desksInterrupted(desks: EngineDesks, slug: string): void {
  desks.traffic.interrupt(slug);
  desks.pins.forget(slug);
  desks.cooling.forget(slug);
  desks.judging.forget(slug);
  desks.logs.interrupt(slug);
}

export function desksForget(desks: EngineDesks, slug: string): void {
  desks.traffic.forget(slug);
  desks.pins.forget(slug);
  desks.cooling.forget(slug);
  desks.judging.forget(slug);
  desks.logs.forget(slug);
}

export function desksServing(desks: EngineDesks, gateway: EngineGateway): void {
  desks.traffic.keepOnly(gateway);
  desks.logs.resume(gateway.slug);
  desks.logs.backfill();
}
