import { Link } from '@tanstack/react-router';

/**
 * The note standing where a picker would list providers and has none to list.
 *
 * @summary A picker left blank reads as a flow that failed rather than a step not taken yet, so the
 * absence names itself and points at the screen that ends it. The link leaves the canvas for
 * Providers instead of opening a sheet over it, because connecting a provider is its own errand
 * with its own steps, and the draft it leaves behind keeps standing until the person returns.
 */
export function NoProviderNote() {
  return (
    <div className="flex flex-col items-start gap-1.5 rounded-control border border-line-faint bg-surface-inert p-2.5">
      <p className="text-control font-semibold text-ink">No provider connected yet</p>
      <p className="text-detail text-ink-secondary">Connect one in Providers first.</p>
      <Link
        className="mt-1 push-button whitespace-nowrap"
        search={{ kind: 'subscription' }}
        to="/providers"
      >
        Open Providers
      </Link>
    </div>
  );
}
