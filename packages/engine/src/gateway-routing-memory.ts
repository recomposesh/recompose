import type { CooldownLedger } from './routing/cooldown-ledger';
import type { RotationCursors } from './routing/rotation-cursors';

import { createCooldownLedger } from './routing/cooldown-ledger';
import { createRotationCursors } from './routing/rotation-cursors';

export type RoutingMemory = {
  ledger: CooldownLedger;
  cursors: RotationCursors;
  now: () => number;
};

/**
 * What one gateway remembers between requests: which children stand down, and whose turn is next.
 *
 * @summary The memory belongs to the gateway rather than to the process, so two gateways serving the
 * same accounts never inherit each other's cooling and a spec builds one gateway without disturbing
 * the next. It owes nothing to disk: the engine child restarting forgets every cooling child and one
 * uneven turn, which is the whole health model a person's metered accounts deserve.
 */
export function routingMemory(): RoutingMemory {
  return {
    ledger: createCooldownLedger(Date.now),
    cursors: createRotationCursors(),
    now: Date.now,
  };
}
