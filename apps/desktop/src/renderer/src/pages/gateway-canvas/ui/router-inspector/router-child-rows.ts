import type { Account, RouteNode, Routing } from '@recompose/contracts';

import { nameOfRouter } from '@recompose/contracts';

import type { ConditionalPolicy } from '../../lib/conditional-policy';
import type { RouterChild } from '../router-child-list/router-child-list';

import { accountMark, accountName } from '../../../../entities/account';
import { addressWritten } from '../../lib/route-addresses';
import { childTally } from '../router-node/router-reading';

/** The word the else row answers to, which is the same word the judge is never offered. */
export const ELSE = 'Else';

/**
 * Why the else row keeps its place, said wherever a ladder shows one.
 *
 * @summary The stored rows and the rows a switch is still being defined over both draw an else,
 * and one sentence rather than two keeps a person reading their own reason on either surface.
 */
export const WHY_ELSE_STAYS =
  'Every conditional router keeps an else branch. It catches a request the judge read but could not place.';

/** How a conditional router reads its own children, which is what turns rows into branches. */
export type BranchReading = {
  /** The policy naming the branches and the else child. */
  policy: ConditionalPolicy;
  /** How many conversations each child currently holds, keyed by route node id. */
  pins?: ReadonlyMap<string, number> | undefined;
};

type ChildPlace = { modelId: string; routeNodeId: string };

function pinsHeld(routeNodeId: string, reading: BranchReading): { pins?: number } {
  const pins = reading.pins?.get(routeNodeId) ?? 0;

  return pins === 0 ? {} : { pins };
}

/**
 * What one child of a conditional router is, beyond the binding behind it.
 *
 * @summary The else child takes no label of its own and no rule, because it catches exactly what
 * no rule placed, and it says why it stays rather than losing its controls without a word. A child
 * holding no branch yet is left blank on purpose: that blankness is the draft state the canvas
 * paints amber, and inventing a label here would tell the judge a word nobody wrote.
 */
function branchFacts(
  routeNodeId: string,
  reading: BranchReading,
): Pick<RouterChild, 'inertReason' | 'label' | 'pins' | 'rule'> {
  const counted = pinsHeld(routeNodeId, reading);

  if (routeNodeId === reading.policy.elseChild) {
    return { label: ELSE, inertReason: WHY_ELSE_STAYS, ...counted };
  }

  const branch = reading.policy.branches.find((held) => held.child === routeNodeId);

  return branch === undefined ? counted : { label: branch.label, rule: branch.rule, ...counted };
}

function targetChildRow(
  place: ChildPlace,
  node: Extract<RouteNode, { kind: 'target' }>,
  accounts: readonly Account[],
): RouterChild {
  const account = accounts.find((held) => held.id === node.accountId);
  const mark = account === undefined ? undefined : accountMark(account);
  const stands = account === undefined ? 'ghost' : 'target';

  return {
    routeNodeId: place.routeNodeId,
    cardId: `${stands}:${addressWritten(place)}`,
    name: account === undefined ? node.accountId : accountName(account),
    detail: node.providerModel,
    ...(mark === undefined ? {} : { mark }),
  };
}

function childRow(place: ChildPlace, node: RouteNode, accounts: readonly Account[]): RouterChild {
  if (node.kind !== 'router') {
    return targetChildRow(place, node, accounts);
  }

  return {
    routeNodeId: place.routeNodeId,
    cardId: `route:${addressWritten(place)}`,
    name: nameOfRouter(node.policy.mode, node.displayName),
    detail: childTally(node.children.length),
    glyph: 'branch',
    glyphTint: 'text-router',
  };
}

/**
 * The rows a router's ladder reads, in the order the stored table declares them.
 *
 * @summary A child names the account behind it and the real model it serves, and a nested router
 * names itself and how many children it holds. The account rather than its vendor product, because
 * pooling several accounts of one vendor is what a router is for: a product name would print one
 * word down the whole ladder, and the move controls and the live region read this same name, so a
 * person would be told a child moved without being told which. It is the name the removal question
 * already asks about, so one child answers to one name wherever it stands. An account that left the
 * registry keeps its id in the name, because a broken child is the row a person came back to repair
 * and a blank one says nothing about it. A child naming no node in the table stands no row, since
 * the stored shape refuses that table at parse and a row for nothing would say a binding exists
 * where none does.
 */
export function routerChildRows(
  modelId: string,
  routing: Routing,
  children: readonly string[],
  accounts: readonly Account[],
  reading?: BranchReading,
): readonly RouterChild[] {
  const rows: RouterChild[] = [];

  for (const routeNodeId of children) {
    const node = routing.nodes[routeNodeId];

    if (node !== undefined) {
      const row = childRow({ modelId, routeNodeId }, node, accounts);

      rows.push(reading === undefined ? row : { ...row, ...branchFacts(routeNodeId, reading) });
    }
  }

  return rows;
}
