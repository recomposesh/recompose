import { z } from 'zod';

import { nonBlankString } from './non-blank';

export const routeNodeIdSchema = nonBlankString;

/**
 * A fresh id for one route node, minted where a person binds one.
 *
 * @summary Not the only writer of a route node id, and a reader must not take this shape for the
 * only shape: the version 4 migration derives `seat:` plus the model's own id without coming
 * through here, because it runs on every load of a document nothing rewrites and a random id would
 * differ between the snapshot the engine holds and the lookup a request makes against the same
 * file. So a stored id is either a UUID or a colon-carrying derivation, and anything reading one
 * apart has to tolerate both. Every runtime key pairs the id with its gateway and its virtual
 * model, so an id needs to stand apart only inside the table that holds it.
 */
export function mintRouteNodeId(): string {
  return crypto.randomUUID();
}

const branchSchema = z.strictObject({
  label: nonBlankString,
  rule: nonBlankString,
  child: routeNodeIdSchema,
});

export const routerPolicySchema = z.discriminatedUnion('mode', [
  z.strictObject({ mode: z.literal('failover') }),
  z.strictObject({ mode: z.literal('round-robin') }),
  z.strictObject({
    mode: z.literal('conditional'),
    judge: routeNodeIdSchema,
    branches: z.array(branchSchema),
    elseChild: routeNodeIdSchema,
    judgeBoundMs: z.number().int().positive(),
    rejudgeEveryRequest: z.boolean(),
  }),
]);

export type RouterPolicy = z.infer<typeof routerPolicySchema>;

type ConditionalPolicy = Extract<RouterPolicy, { mode: 'conditional' }>;

const NAME_OF_MODE: Record<RouterPolicy['mode'], string> = {
  failover: 'Failover',
  'round-robin': 'Round-robin',
  conditional: 'Conditional',
};

/**
 * What one routing mode is called wherever a person reads it or picks it.
 *
 * @summary The mode control offers these words and a nameless router wears one of them, so the two
 * are the same string by construction rather than by two lists agreeing. A person who picks
 * "Failover" and then reads "Failover" on the card is reading back exactly what they chose.
 */
export function nameOfRouterMode(mode: RouterPolicy['mode']): string {
  return NAME_OF_MODE[mode];
}

/**
 * The name a router answers to wherever one is spoken of.
 *
 * @summary A person wires a router in one gesture and never has to name it, so every surface owes it
 * a name it did not ask for. The mode is the only fact a nameless router carries that a reader can
 * use, and it is the fact a reader wants: a refusal that says which ladder stood in the way says it
 * best by saying how that ladder chooses. A name a person did write outranks the mode, because a name
 * that changes under an edit is not a name. The card, the inspector, and the refusal all ask here, so
 * a person who reads a refusal in their client finds the very words the canvas showed them.
 */
export function nameOfRouter(mode: RouterPolicy['mode'], displayName?: string): string {
  return displayName ?? NAME_OF_MODE[mode];
}

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

function conditionalPolicyOf(node: RouteNode): ConditionalPolicy | undefined {
  if (node.kind !== 'router' || node.policy.mode !== 'conditional') {
    return undefined;
  }

  return node.policy;
}

function referencesOf(node: RouteNode): readonly string[] {
  const judge = conditionalPolicyOf(node)?.judge;

  return judge === undefined ? childrenOf(node) : [...childrenOf(node), judge];
}

function eachBranchNamesAChild(
  id: string,
  node: RouteNode,
  policy: ConditionalPolicy,
  context: z.RefinementCtx,
): void {
  const children = new Set(childrenOf(node));
  const at: PropertyKey[] = ['nodes', id, 'policy'];

  if (!children.has(policy.elseChild)) {
    const stray = policy.elseChild;

    refuse(
      context,
      [...at, 'elseChild'],
      `the else child ${stray} stands outside this router's children`,
    );
  }

  for (const branch of policy.branches) {
    if (!children.has(branch.child)) {
      refuse(
        context,
        [...at, 'branches'],
        `the ${branch.label} branch names ${branch.child}, standing outside this router's children`,
      );
    }
  }
}

function eachConditionalRouterHoldsItsBranches(
  nodes: Map<string, RouteNode>,
  context: z.RefinementCtx,
): void {
  for (const [id, node] of nodes) {
    const policy = conditionalPolicyOf(node);

    if (policy !== undefined) {
      eachBranchNamesAChild(id, node, policy, context);
    }
  }
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

function queueReferences(visit: PendingVisit, node: RouteNode, pending: PendingVisit[]): void {
  for (const referenced of referencesOf(node)) {
    pending.push({ id: referenced, routersAbove: visit.routersAbove + 1 });
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
    queueReferences(visit, node, pending);

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
  eachConditionalRouterHoldsItsBranches(nodes, context);
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
