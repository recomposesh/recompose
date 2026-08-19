import type { RouteNode, RouteTarget, Routing } from '@recompose/contracts';

/** Which branch of a conditional router reaches one child: a labeled rule, or the fallback. */
export type BranchSeat = { kind: 'rule'; label: string; rule: string } | { kind: 'else' };

/** One node of a virtual model's route table, read with where it stands in the routing. */
export type WalkedRouteNode = {
  /** The id the stored table holds this node under. */
  routeNodeId: string;
  /** The node itself, which is a target or a router. */
  node: RouteNode;
  /** How many routers stand between the virtual model and this node. */
  depth: number;
  /** The route node that names this one as a child, or nothing at the entry. */
  parent: string | undefined;
  /** The branch the parent reaches this node by, or nothing where no judge decides. */
  branch: BranchSeat | undefined;
  /** The router this node judges for, or nothing wherever it stands as a child instead. */
  advises: string | undefined;
  /** The judge standing beside this router, or nothing where the table holds none. */
  judgedBy: string | undefined;
};

type RouterNode = Extract<RouteNode, { kind: 'router' }>;

function judgedPolicyOf(node: RouteNode) {
  if (node.kind !== 'router') {
    return undefined;
  }

  return node.policy.mode === 'conditional' ? node.policy : undefined;
}

/**
 * Which branch of one router reaches each of its children, keyed by the child it reaches.
 *
 * @summary The first branch that names a child does the naming, and else takes only a child no
 * branch spoke for, so a child two rules reach still reads as the rule a person declared first and
 * a cable never loses the rule it draws for. A router that reads no request at all names nothing
 * here, because ordering children and rotating between them are not decisions about the request.
 */
function branchSeatsOf(node: RouteNode): ReadonlyMap<string, BranchSeat> {
  const policy = judgedPolicyOf(node);
  const seats = new Map<string, BranchSeat>();

  if (policy === undefined) {
    return seats;
  }

  for (const branch of policy.branches) {
    if (!seats.has(branch.child)) {
      seats.set(branch.child, { kind: 'rule', label: branch.label, rule: branch.rule });
    }
  }

  if (!seats.has(policy.elseChild)) {
    seats.set(policy.elseChild, { kind: 'else' });
  }

  return seats;
}

function judgeBeside(routing: Routing, walked: WalkedRouteNode): WalkedRouteNode | undefined {
  const judge = judgedPolicyOf(walked.node)?.judge;
  const node = judge === undefined ? undefined : routing.nodes[judge];

  if (judge === undefined || node === undefined) {
    return undefined;
  }

  return {
    routeNodeId: judge,
    node,
    depth: walked.depth,
    parent: walked.routeNodeId,
    branch: undefined,
    advises: walked.routeNodeId,
    judgedBy: undefined,
  };
}

function childrenWalked(
  routing: Routing,
  walked: WalkedRouteNode,
  node: RouterNode,
  into: WalkedRouteNode[],
): void {
  const seats = branchSeatsOf(node);

  for (const childId of node.children) {
    const child = routing.nodes[childId];

    if (child !== undefined) {
      walkSubtree(
        routing,
        {
          routeNodeId: childId,
          node: child,
          depth: walked.depth + 1,
          parent: walked.routeNodeId,
          branch: seats.get(childId),
          advises: undefined,
          judgedBy: undefined,
        },
        into,
      );
    }
  }
}

function walkSubtree(routing: Routing, walked: WalkedRouteNode, into: WalkedRouteNode[]): void {
  if (walked.node.kind !== 'router') {
    into.push(walked);

    return;
  }

  const advisor = judgeBeside(routing, walked);

  into.push(advisor === undefined ? walked : { ...walked, judgedBy: advisor.routeNodeId });

  if (advisor !== undefined) {
    into.push(advisor);
  }

  childrenWalked(routing, walked, walked.node, into);
}

/**
 * Every node a route table holds, in the order a person declared them, each with its depth.
 *
 * @summary This is the one walk of a stored route table the canvas owns, so the cards, the cables,
 * the seating, and the drawer all read one traversal rather than four that drift. The order is the
 * order a ladder declares, entry first and each child before its own children, which is what makes
 * a router's children land on adjacent rows and its cables fan without crossing. The depth is what
 * the column derives from, so a node one router down stands one pitch further out. A child naming
 * no node in the table adds nothing, because the stored shape refuses that table at parse and a
 * card standing for nothing would say a binding exists where none does.
 *
 * A conditional router's judge follows the router it advises and stands at the router's own depth,
 * because it advises rather than answers: it takes no column of its own and no request travels to
 * it. It carries the router it advises, and the router carries it back, which is how every reader
 * tells an advisor from a child, and a card says whether its judge resolved, without looking the
 * policy up again. A judge naming no node in the table stands nowhere and the router says so.
 */
export function walkedRouteNodes(routing: Routing): readonly WalkedRouteNode[] {
  const entry = routing.nodes[routing.entry];

  if (entry === undefined) {
    return [];
  }

  const walked: WalkedRouteNode[] = [];

  walkSubtree(
    routing,
    {
      routeNodeId: routing.entry,
      node: entry,
      depth: 0,
      parent: undefined,
      branch: undefined,
      advises: undefined,
      judgedBy: undefined,
    },
    walked,
  );

  return walked;
}

/**
 * The target a route table reaches first, which is the one every reading of a single model uses.
 *
 * @summary A reader needing one account and one real model asks the ladder what it tries first,
 * because that is the target a request meets before any failure moves it along. A table holding no
 * target at all answers nothing, so a router a person has not filled yet reads as incomplete rather
 * than as bound to something. A judge is never that target however early it stands in the walk: no
 * request is routed to it, so a reading of what a model answers with must never name it and no
 * count of what a model costs may bill it.
 */
export function firstDeclaredTarget(routing: Routing): RouteTarget | undefined {
  for (const walked of walkedRouteNodes(routing)) {
    if (walked.node.kind === 'target' && walked.advises === undefined) {
      return walked.node;
    }
  }

  return undefined;
}
