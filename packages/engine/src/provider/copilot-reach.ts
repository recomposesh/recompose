import type { SpendGrant } from '@recompose/contracts';

import type { Crossing, ProviderDialect } from '../gateway-wire';
import type { CopilotCatalog } from './copilot-catalog';

import { copilotWireOf } from './copilot-catalog';

type ResolvedGrant = Extract<SpendGrant, { verdict: 'resolved' }>;

export type CopilotReachDeps = {
  fetchLike: typeof fetch;
  now: () => number;
  catalog?: CopilotCatalog | undefined;
};

/**
 * The dialect a Copilot turn answers in, having stamped the path it is reached on.
 *
 * @summary Copilot names its own wire per model, so the dialect and the path are one decision and
 * both are settled before the body is translated. A gateway holding no catalog reads as no
 * decision, which leaves the completions reach this gateway has always taken.
 */
export async function copilotReachFor(
  deps: CopilotReachDeps,
  crossing: Crossing,
  grant: ResolvedGrant,
): Promise<ProviderDialect | null> {
  const catalog = deps.catalog;
  const spend = grant.spend;

  if (catalog === undefined) return null;
  if (spend.custody !== 'subscription' || spend.provider !== 'copilot') return null;

  const wire = await copilotWireOf(
    { fetchLike: deps.fetchLike, now: deps.now, catalog },
    spend,
    grant.providerOrigin,
    crossing.providerModel,
  );

  crossing.copilotPath = wire.path;

  return wire.dialect;
}
