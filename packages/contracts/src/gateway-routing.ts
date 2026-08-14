import { z } from 'zod';

import { nonBlankString } from './non-blank';

export const routeNodeIdSchema = nonBlankString;

/**
 * A fresh id for one route node, minted where a person binds one or where a stored target becomes
 * a graph.
 *
 * @summary The only rule that writes a route node id, so the canvas and the stored migration never
 * drift apart on format. Every runtime key pairs the id with its gateway and its virtual model, so
 * an id needs to stand apart only inside the table that holds it.
 */
export function mintRouteNodeId(): string {
  return crypto.randomUUID();
}

export const routerPolicySchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('failover') }),
  z.strictObject({ mode: z.literal('round-robin') }),
]);

export type RouterPolicy = z.infer<typeof routerPolicySchema>;

export const routeNodeSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('target'),
    accountId: nonBlankString,
    providerModel: nonBlankString,
  }),
  z.strictObject({
    kind: z.literal('router'),
    displayName: nonBlankString.optional(),
    policy: routerPolicySchema,
    children: z.array(routeNodeIdSchema),
  }),
]);

export type RouteNode = z.infer<typeof routeNodeSchema>;

export type RouteTarget = Extract<RouteNode, { kind: 'target' }>;

export const ROUTER_DEPTH_LIMIT = 4;

const routeTableSchema = z.strictObject({
  entry: routeNodeIdSchema,
  nodes: z.record(routeNodeIdSchema, routeNodeSchema),
});

type RouteTable = z.infer<typeof routeTableSchema>;

type PendingVisit = { id: string; routersAbove: number };

function refuse(context: z.RefinementCtx, path: PropertyKey[], message: string): void {
  context.addIssue({ code: 'custom', path, message });
}

function childrenOf(node: RouteNode): readonly string[] {
  return node.kind === 'router' ? node.children : [];
}

function eachChildResolves(nodes: Map<string, RouteNode>, context: z.RefinementCtx): void {
  for (const [id, node] of nodes) {
    for (const child of childrenOf(node)) {
      if (!nodes.has(child)) {
        refuse(context, ['nodes', id, 'children'], `child ${child} names no node in the table`);
      }
    }
  }
}

function inboundReferences(nodes: Map<string, RouteNode>): Map<string, number> {
  const references = new Map<string, number>();

  for (const node of nodes.values()) {
    for (const child of childrenOf(node)) {
      references.set(child, (references.get(child) ?? 0) + 1);
    }
  }

  return references;
}

function eachNodeAnswersToOneParent(
  entry: string,
  nodes: Map<string, RouteNode>,
  context: z.RefinementCtx,
): void {
  const references = inboundReferences(nodes);

  for (const [id, count] of references) {
    if (count > 1) {
      refuse(context, ['nodes', id], `node ${id} answers to more than one parent`);
    }
  }

  if (references.has(entry)) {
    refuse(context, ['entry'], `the entry ${entry} also stands as a child`);
  }
}

function nodeAwaitingVisit(
  visit: PendingVisit,
  nodes: Map<string, RouteNode>,
  visited: Set<string>,
): RouteNode | undefined {
  return visited.has(visit.id) ? undefined : nodes.get(visit.id);
}

function queueChildren(visit: PendingVisit, node: RouteNode, pending: PendingVisit[]): void {
  for (const child of childrenOf(node)) {
    pending.push({ id: child, routersAbove: visit.routersAbove + 1 });
  }
}

function standsTooDeep(node: RouteNode, visit: PendingVisit): boolean {
  return node.kind === 'router' && visit.routersAbove >= ROUTER_DEPTH_LIMIT;
}

function reachedFromEntry(
  entry: string,
  nodes: Map<string, RouteNode>,
  context: z.RefinementCtx,
): Set<string> {
  const visited = new Set<string>();
  const pending: PendingVisit[] = [{ id: entry, routersAbove: 0 }];

  for (const visit of pending) {
    const node = nodeAwaitingVisit(visit, nodes, visited);

    if (node === undefined) {
      continue;
    }

    visited.add(visit.id);
    queueChildren(visit, node, pending);

    if (standsTooDeep(node, visit)) {
      const bound = String(ROUTER_DEPTH_LIMIT);

      refuse(context, ['nodes', visit.id], `${visit.id} stands past ${bound} nested routers`);
    }
  }

  return visited;
}

function routingServesFromItsEntry(table: RouteTable, context: z.RefinementCtx): void {
  const nodes = new Map(Object.entries(table.nodes));

  if (!nodes.has(table.entry)) {
    refuse(context, ['entry'], `the entry ${table.entry} names no node in the table`);

    return;
  }

  eachChildResolves(nodes, context);
  eachNodeAnswersToOneParent(table.entry, nodes, context);

  const reached = reachedFromEntry(table.entry, nodes, context);

  for (const id of nodes.keys()) {
    if (!reached.has(id)) {
      refuse(context, ['nodes', id], `node ${id} stands unreachable from the entry`);
    }
  }
}

export const routingSchema = routeTableSchema.superRefine(routingServesFromItsEntry);

export type Routing = z.infer<typeof routingSchema>;

/**
 * The one target a routing binds, or nothing when its entry hands the request to a router.
 *
 * @summary Every reader that needs a single account and a single provider model asks here, so the
 * one place that turns a graph into one binding is this function rather than each reader's own
 * lookup. A graph whose entry stands a router answers nothing, because no single target speaks for
 * a ladder.
 */
export function targetTheEntryNames(routing: Routing): RouteTarget | undefined {
  const entry = routing.nodes[routing.entry];

  return entry?.kind === 'target' ? entry : undefined;
}
