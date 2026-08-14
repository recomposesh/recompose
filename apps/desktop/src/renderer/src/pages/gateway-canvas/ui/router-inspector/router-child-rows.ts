import type { Account, RouteNode, Routing } from '@recompose/contracts';

import { nameOfRouter } from '@recompose/contracts';

import type { RouterChild } from '../router-child-list/router-child-list';

import { accountProductName } from '../../../../entities/account';
import { childTally } from '../router-node/router-reading';

function childRow(routeNodeId: string, node: RouteNode, accounts: readonly Account[]): RouterChild {
  if (node.kind === 'router') {
    return {
      routeNodeId,
      name: nameOfRouter(node.policy.mode, node.displayName),
      detail: childTally(node.children.length),
    };
  }

  const account = accounts.find((held) => held.id === node.accountId);

  return {
    routeNodeId,
    name: account === undefined ? node.accountId : accountProductName(account),
    detail: node.providerModel,
  };
}

/**
 * The rows a router's ladder reads, in the order the stored table declares them.
 *
 * @summary A child reads as what a person would point at on the canvas: a target names the
 * provider product behind it and the real model it serves, and a nested router names itself and
 * how many children it holds. An account that left the registry keeps its id in the name, because
 * a broken child is the row a person came back to repair and a blank one says nothing about it.
 * A child naming no node in the table stands no row, since the stored shape refuses that table at
 * parse and a row for nothing would say a binding exists where none does.
 */
export function routerChildRows(
  routing: Routing,
  children: readonly string[],
  accounts: readonly Account[],
): readonly RouterChild[] {
  const rows: RouterChild[] = [];

  for (const routeNodeId of children) {
    const node = routing.nodes[routeNodeId];

    if (node !== undefined) {
      rows.push(childRow(routeNodeId, node, accounts));
    }
  }

  return rows;
}
