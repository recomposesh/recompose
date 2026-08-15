import type { Account, RouteTarget, Routing, VirtualModel } from '@recompose/contracts';

import { walkedRouteNodes } from '../lib/route-graph';

/**
 * Where a definition stands: on a pool the registry holds whole, on one it holds in part, on
 * nothing the registry still holds, or on a composition that names no provider yet.
 */
type ServedTarget =
  | { standing: 'serving'; account: Account }
  | { standing: 'thinned'; account: Account; lost: number }
  | { standing: 'removed' }
  | { standing: 'incomplete' };

export type ServedModel = {
  /** The id a client asks this gateway for. */
  id: string;
  /** The name a person gave the model. */
  displayName: string;
  /** The real model the account this definition reads through was bound to serve. */
  providerModel: string;
  /** Where the definition stands as of this reading of the registry. */
  target: ServedTarget;
};

type ServingTarget = { target: RouteTarget; account: Account };

function declaredTargets(routing: Routing): readonly RouteTarget[] {
  return walkedRouteNodes(routing).flatMap((walked) =>
    walked.node.kind === 'target' ? [walked.node] : [],
  );
}

function stillServing(
  targets: readonly RouteTarget[],
  accounts: readonly Account[],
): readonly ServingTarget[] {
  return targets.flatMap((target) => {
    const account = accounts.find((held) => held.id === target.accountId);

    return account === undefined ? [] : [{ target, account }];
  });
}

/**
 * Where a definition stands once no target it names is one the registry still holds.
 *
 * @summary A routing naming no target at all is unfinished rather than broken: nothing left it, so
 * a word about removal would send a person to repair a binding that never stood, which is the
 * state a freshly dropped router opens in. A routing naming targets whose accounts all left keeps
 * the real model of the one it tried first, because that binding is what a person comes back to.
 */
function nothingStillServing(
  targets: readonly RouteTarget[],
): Omit<ServedModel, 'id' | 'displayName'> {
  const [tried] = targets;

  return tried === undefined
    ? { providerModel: '', target: { standing: 'incomplete' } }
    : { providerModel: tried.providerModel, target: { standing: 'removed' } };
}

/**
 * The real model a definition names and where its pool stands, read as one answer.
 *
 * @summary Both readings come off the same target, because a row naming one account's real model
 * beside another account's name would describe a binding that exists nowhere. A pool that lost a
 * target it could still route around is neither whole nor broken, so it answers how many left
 * rather than borrowing the word on either side of it.
 */
function readThrough(
  routing: Routing,
  accounts: readonly Account[],
): Omit<ServedModel, 'id' | 'displayName'> {
  const targets = declaredTargets(routing);
  const serving = stillServing(targets, accounts);
  const leading = serving[0];
  const lost = targets.length - serving.length;

  if (leading === undefined) {
    return nothingStillServing(targets);
  }

  return {
    providerModel: leading.target.providerModel,
    target:
      lost === 0
        ? { standing: 'serving', account: leading.account }
        : { standing: 'thinned', account: leading.account, lost },
  };
}

/**
 * What the gateway serves, each definition read against the registry as it stands now.
 *
 * @summary A definition holds an account id rather than an account, so whether its targets still
 * stand is a reading of the registry rather than a stored fact. A definition reads through the
 * first target the registry still holds, which is the one a request reaches once failover has
 * stepped over whatever left, so a pool that lost its lead reads as the thinner pool it is rather
 * than as a broken binding. A definition whose every account left keeps its real model name,
 * because the binding is what a person comes back to repair, and the order stays the gateway's, so
 * the drawer never reshuffles itself between two looks.
 */
export function servedModels(
  models: readonly VirtualModel[],
  accounts: readonly Account[],
): readonly ServedModel[] {
  return models.map((model) => ({
    id: model.id,
    displayName: model.displayName,
    ...readThrough(model.routing, accounts),
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
