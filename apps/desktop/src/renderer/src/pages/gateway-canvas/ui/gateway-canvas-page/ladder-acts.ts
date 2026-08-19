import type { GatewayConfig } from '@recompose/contracts';

import { mintRouteNodeId } from '@recompose/contracts';

import type { RouteAddress } from '../../lib/route-addresses';
import type { CanvasWorld } from './canvas-standings';

import { conditionalIn } from '../../lib/conditional-policy';
import { addressWritten } from '../../lib/route-addresses';
import { gatewayBindingChild, gatewayRebindingNode } from '../../lib/routing-edits';
import { wordBranch } from '../../lib/use-branch-wording';
import { committedPick, targetNameIn } from './binding-acts';
import { parentRouterAt } from './route-parents';

/** The ladder a binding ask left from, or nothing where the definition holding it has left. */
function ladderAsking(world: CanvasWorld, address: RouteAddress) {
  const parent = parentRouterAt(world, address);

  return parent === undefined ? undefined : { address, parent };
}

type LadderAsking = NonNullable<ReturnType<typeof ladderAsking>>;

type LandedChild = {
  routeNodeId: string;
  rewritten: GatewayConfig;
  outcome: 'bound' | 'rebound';
};

/**
 * Writes one target into a route node of a ladder and says out loud what became of it.
 *
 * @summary Joining a ladder and moving a binding along it write different documents and read as
 * different words, but both stand one target card under one router, so the card's name and the
 * sentence a person hears are decided in one place rather than twice.
 */
function committedChild(
  world: CanvasWorld,
  asking: LadderAsking,
  landed: LandedChild,
  accountId: string,
): void {
  const { modelId } = asking.address;

  committedPick(
    world,
    `target:${addressWritten({ modelId, routeNodeId: landed.routeNodeId })}`,
    landed.rewritten,
    () => {
      world.standings.announce({
        kind: landed.outcome,
        virtualModel: asking.parent.model.displayName,
        target: targetNameIn(world.accounts, accountId),
      });
    },
  );
}

/**
 * Binds a picked account and real model as one more child of the router the ask came from.
 *
 * @summary A child joins the end of the ladder rather than the front, because failover walks its
 * children in declared order and a new binding jumping ahead would reroute live traffic nobody
 * asked to reroute. The card is named here rather than by the write, so the target a person let a
 * cable go for stands exactly where they let it go.
 */
export function completedChildPick(
  world: CanvasWorld,
  address: RouteAddress,
  accountId: string,
  providerModel: string,
): void {
  const asking = ladderAsking(world, address);

  if (asking === undefined) {
    return;
  }

  const born = mintRouteNodeId();
  const { modelId } = asking.address;

  committedChild(
    world,
    asking,
    {
      routeNodeId: born,
      outcome: 'bound',
      rewritten: gatewayBindingChild(world.gateway, modelId, asking.parent.routeNodeId, born, {
        kind: 'target',
        accountId,
        providerModel,
      }),
    },
    accountId,
  );

  wordedIfJudged(asking, born, providerModel);
}

/**
 * Opens the wording editor on a branch the moment its child lands, where a judge decides the router.
 *
 * @summary A conditional router's children answer to labels, and the label is the vocabulary the
 * judge itself uses, so a child that attached without one would be a branch the judge can never
 * name and a cable a person cannot read. The editor opens on the birth rather than waiting to be
 * found in a panel, which is what keeps the unnamed state to the seconds between the drop and the
 * naming. A router that reads no request has no such vocabulary, so its children attach in silence.
 */
function wordedIfJudged(asking: LadderAsking, child: string, routesTo: string): void {
  const parent = asking.parent.model.routing.nodes[asking.parent.routeNodeId];

  if (conditionalIn(parent) === undefined) {
    return;
  }

  wordBranch({
    modelId: asking.address.modelId,
    routerId: asking.parent.routeNodeId,
    child,
    label: '',
    rule: '',
    routesTo,
  });
}

/**
 * Aims one child of a ladder at the picked target, in the place that child already stands.
 *
 * @summary Letting a child's cable go on another stored target moves that binding, so the write
 * lands on the route node the cable already ended at rather than on a fresh one: appending would
 * leave the child a person was rearranging still standing and lengthen the ladder they meant to
 * aim. The rank survives because the id does, which is what keeps failover trying the pool in the
 * order a person put it in.
 */
export function completedChildRebindPick(
  world: CanvasWorld,
  address: RouteAddress,
  replacing: string,
  accountId: string,
  providerModel: string,
): void {
  const asking = ladderAsking(world, address);

  if (asking === undefined) {
    return;
  }

  committedChild(
    world,
    asking,
    {
      routeNodeId: replacing,
      outcome: 'rebound',
      rewritten: gatewayRebindingNode(world.gateway, asking.address.modelId, replacing, {
        kind: 'target',
        accountId,
        providerModel,
      }),
    },
    accountId,
  );
}
