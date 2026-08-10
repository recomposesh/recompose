import type { SpendGrantFor } from './engine-spend';

/**
 * Hands back the same grants while reporting the first resolved one.
 *
 * @summary Only a resolved grant means a request reached a target, so a refusal reports nothing.
 * The latch closes on the first report and never reopens, so the observer hears about the first
 * request exactly once per process however many turns follow.
 */
export function noticingTheFirstGrant(
  grantFor: SpendGrantFor,
  onFirstGrant: () => void,
): SpendGrantFor {
  let unreported = true;

  return async (slug, virtualModel) => {
    const grant = await grantFor(slug, virtualModel);

    if (grant.verdict === 'resolved' && unreported) {
      unreported = false;
      onFirstGrant();
    }

    return grant;
  };
}
