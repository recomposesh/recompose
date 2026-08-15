import { KindEmptyState } from '../kind-empty-state/kind-empty-state';

/**
 * What stands where the rows would be when no subscription is connected yet.
 *
 * @summary A subscription is the one account kind a person cannot guess the shape of, because it
 * holds no key and reaches no gateway, so one sentence says what it is. The act lives in the
 * window strip, so the state explains rather than asks.
 */
export function SubscriptionsEmptyState() {
  return (
    <KindEmptyState
      explanation="A subscription is a plan you already pay for. Connect the one this machine signs into, or sign in with another."
      title="Nothing connected yet"
    />
  );
}
