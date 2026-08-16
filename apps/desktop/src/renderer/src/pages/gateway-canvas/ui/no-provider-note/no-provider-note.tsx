import { Link } from '@tanstack/react-router';

/**
 * The note standing where a picker would list providers and has none to list.
 *
 * @summary A picker left blank reads as a flow that failed rather than a step not taken yet, so the
 * absence names itself and points at the screen that ends it. The link leaves the canvas for
 * Providers instead of opening a sheet over it, because connecting a provider is its own errand
 * with its own steps, and the draft it leaves behind keeps standing until the person returns. It
 * carries no border of its own: every picker it stands in is already a box, and a second one inside
 * the first reads as a card nested in a card rather than as the list that would have been there.
 */
export function NoProviderNote() {
  return (
    <div className="flex flex-col items-start gap-1.5 px-2 py-2.5">
      <p className="text-heading text-ink">No provider connected yet</p>
      <p className="text-control text-ink-secondary">Connect one in Providers first.</p>
      <Link
        className="mt-2 push-button whitespace-nowrap"
        search={{ kind: 'subscription' }}
        to="/providers"
      >
        Open Providers
      </Link>
    </div>
  );
}
