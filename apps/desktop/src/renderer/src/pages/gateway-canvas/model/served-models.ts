import type { Account, VirtualModel } from '@recompose/contracts';

import { firstDeclaredTarget } from '../lib/route-graph';

/** Where a definition's lead target stands: on an account the registry holds, or on nothing at all. */
type ServedTarget = { standing: 'serving'; account: Account } | { standing: 'removed' };

export type ServedModel = {
  /** The id a client asks this gateway for. */
  id: string;
  /** The name a person gave the model. */
  displayName: string;
  /** The real model the lead target's account was bound to serve. */
  providerModel: string;
  /** Where the lead target stands as of this reading of the registry. */
  target: ServedTarget;
};

function targetStanding(model: VirtualModel, accounts: readonly Account[]): ServedTarget {
  const bound = firstDeclaredTarget(model.routing);
  const account = accounts.find((held) => held.id === bound?.accountId);

  return account === undefined ? { standing: 'removed' } : { standing: 'serving', account };
}

/**
 * What the gateway serves, each definition read against the registry as it stands now.
 *
 * @summary A definition holds an account id rather than an account, so whether its target still
 * stands is a reading of the registry rather than a stored fact. A definition reads through the
 * target its routing tries first, which is the one a request meets before any failure moves it
 * along, so a routed definition names an account and a real model rather than reading as bound to
 * nothing. An account that left keeps its definition and its real model name, because the binding
 * is what a person comes back to repair, and the order stays the gateway's, so the drawer never
 * reshuffles itself between two looks.
 */
export function servedModels(
  models: readonly VirtualModel[],
  accounts: readonly Account[],
): readonly ServedModel[] {
  return models.map((model) => ({
    id: model.id,
    displayName: model.displayName,
    providerModel: firstDeclaredTarget(model.routing)?.providerModel ?? '',
    target: targetStanding(model, accounts),
  }));
}

/**
 * How many virtual models the section heading says a gateway serves.
 *
 * @summary A gateway serving none says so in words rather than counting to zero, because a zero
 * beside a heading reads as a measurement where a person needs an invitation.
 */
export function servesTally(count: number): string {
  if (count === 0) {
    return 'no virtual models yet';
  }

  return count === 1 ? '1 virtual model' : `${String(count)} virtual models`;
}
