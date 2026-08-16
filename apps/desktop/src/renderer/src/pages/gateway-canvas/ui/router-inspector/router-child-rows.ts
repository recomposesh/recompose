import type { Account, RouteNode, Routing } from '@recompose/contracts';

import { nameOfRouter } from '@recompose/contracts';

import type { RouterChild } from '../router-child-list/router-child-list';

import { accountMark, accountName } from '../../../../entities/account';
import { addressWritten } from '../../lib/route-addresses';
import { childTally } from '../router-node/router-reading';

type ChildPlace = { modelId: string; routeNodeId: string };

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
): readonly RouterChild[] {
  const rows: RouterChild[] = [];

  for (const routeNodeId of children) {
    const node = routing.nodes[routeNodeId];

    if (node !== undefined) {
      rows.push(childRow({ modelId, routeNodeId }, node, accounts));
    }
  }

  return rows;
}
