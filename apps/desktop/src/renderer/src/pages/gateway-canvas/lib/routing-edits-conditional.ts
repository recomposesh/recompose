import type { GatewayConfig, RouteNode, RouteTarget, Routing } from '@recompose/contracts';

import { mintRouteNodeId } from '@recompose/contracts';

import type { BranchWording } from './conditional-policy';

import { bornConditionalPolicy, branchesWriting, conditionalIn } from './conditional-policy';
import { routedBy, routerEdited } from './routing-edits';

/**
 * A route table reaching one fresh conditional router, over the one child that catches everything.
 *
 * @summary A conditional router cannot be born the way the other two are, because its stored shape
 * names an else child and a judge by id: a router born holding neither would be a table the schema
 * refuses. So the birth takes both, and the target a person picked in the drawer becomes the else
 * child, which is what choosing this mode means. The branches arrive afterwards, one per cable.
 */
export function routedThroughAConditionalRouter(
  judge: RouteTarget,
  elseChild: RouteTarget,
  displayName?: string,
): Routing {
  const entry = mintRouteNodeId();
  const judgeId = mintRouteNodeId();
  const elseId = mintRouteNodeId();
  const router: RouteNode = {
    kind: 'router',
    policy: bornConditionalPolicy(judgeId, elseId),
    children: [elseId],
  };

  return {
    entry,
    nodes: {
      [entry]: displayName === undefined ? router : { ...router, displayName },
      [judgeId]: judge,
      [elseId]: elseChild,
    },
  };
}

function standsAsAChild(routing: Routing, nodeId: string): boolean {
  return Object.values(routing.nodes).some(
    (node) => node.kind === 'router' && node.children.includes(nodeId),
  );
}

/**
 * The gateway once one conditional router reads its requests through a different judge.
 *
 * @summary The judge joins the table as a target of its own and no children array names it, which
 * is what keeps it out of declared order: a walk that met the judge as a child would try it as a
 * candidate and a refusal would name it. An id some ladder already holds is refused for the same
 * reason. A router spreading some other way has no judge to bind, so the ask leaves the table alone
 * rather than stranding a target nothing reaches.
 *
 * The judge it replaces leaves with it, because the policy was the only thing naming that node and
 * a target no reference reaches is a table the stored shape refuses.
 */
export function gatewayBindingJudge(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  judgeId: string,
  judge: RouteTarget,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) => {
    const policy = conditionalIn(was.nodes[routerId]);

    if (policy === undefined || standsAsAChild(was, judgeId)) {
      return was;
    }

    const pointed = routerEdited(was, routerId, (router) => ({
      ...router,
      policy: { ...policy, judge: judgeId },
    }));
    const kept = Object.fromEntries(
      Object.entries(pointed.nodes).filter(([id]) => id !== policy.judge),
    );

    return { entry: pointed.entry, nodes: { ...kept, [judgeId]: judge } };
  });
}

/**
 * The gateway once one conditional router asks its judge at a different rhythm.
 *
 * @summary The rhythm is the whole of what the toggle moves, so the judge, the branches, and the
 * else child stand exactly as they did: a person trying the other rhythm is not rebinding anything.
 */
export function gatewayJudgingEveryRequest(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  rejudgeEveryRequest: boolean,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) => {
    const policy = conditionalIn(was.nodes[routerId]);

    if (policy === undefined) {
      return was;
    }

    return routerEdited(was, routerId, (router) => ({
      ...router,
      policy: { ...policy, rejudgeEveryRequest },
    }));
  });
}

/**
 * The gateway once one child of a conditional router answers to a label and a rule.
 *
 * @summary Writing the same child twice rewrites the branch it already stood as rather than adding
 * a second, because one child answers to one label and two would leave the judge a vocabulary no
 * cable explains. A child holding no branch yet joins the end, so the order a person built reads
 * back the way they built it. Every refusal is one the stored shape would refuse anyway, so the
 * save never bounces.
 */
export function gatewayWritingBranch(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  child: string,
  wording: BranchWording,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) => {
    const held = was.nodes[routerId];
    const policy = conditionalIn(held);

    if (policy === undefined || held?.kind !== 'router') {
      return was;
    }

    const branches = branchesWriting(policy, held.children, child, wording);

    return branches === undefined
      ? was
      : routerEdited(was, routerId, (router) => ({ ...router, policy: { ...policy, branches } }));
  });
}
