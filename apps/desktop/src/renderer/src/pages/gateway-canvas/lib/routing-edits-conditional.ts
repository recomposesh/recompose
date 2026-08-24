import type { GatewayConfig, RouteTarget, Routing } from '@recompose/contracts';

import type { ConditionalSwitch } from './conditional-draft';
import type { BranchWording, ConditionalPolicy } from './conditional-policy';

import { switchWhole } from './conditional-draft';
import { bornConditionalPolicy, branchesWriting, conditionalIn } from './conditional-policy';
import { routedBy, routerEdited } from './routing-edits';
import { judgeStillAsked, tableWithout } from './routing-subtrees';

function standsAsAChild(routing: Routing, nodeId: string): boolean {
  return Object.values(routing.nodes).some(
    (node) => node.kind === 'router' && node.children.includes(nodeId),
  );
}

/**
 * What a whole switch writes, which is the policy the router takes and the judge that joins it.
 *
 * @summary Nothing where the definition would not store: the stored shape refuses a conditional
 * router missing a judge, an else child, or a labelled branch, so the refusal lands before the
 * write rather than as a schema message written for a developer. The last declared child becomes
 * the else, because that is the order the ladder already read in and an unruled last row is the one
 * a person meant to catch the rest. The words reach storage trimmed, since the judge answers with
 * the very word the cable prints.
 */
function switchWriting(
  judgeId: string,
  held: ConditionalSwitch,
): { policy: ConditionalPolicy; judge: RouteTarget } | undefined {
  const elseChild = held.branches.at(-1);

  if (elseChild === undefined || held.judge === undefined || !switchWhole(held)) {
    return undefined;
  }

  return {
    policy: {
      ...bornConditionalPolicy(judgeId, elseChild.routeNodeId),
      branches: held.branches.slice(0, -1).map((branch) => ({
        label: branch.label.trim(),
        rule: branch.rule.trim(),
        child: branch.routeNodeId,
      })),
    },
    judge: { kind: 'target', ...held.judge },
  };
}

/**
 * The gateway once a stored router spreads by reading its requests instead of by ranking them.
 *
 * @summary Every binding a person already made stands, so the switch changes how a ladder decides
 * rather than rebuilding what it holds. The children take the order the definition arranged them
 * in, because that order is how the else was chosen: a stored ladder whose rows read differently
 * from the ones a person just arranged would leave the else somewhere they did not put it. The
 * judge joins as a target of its own that no children array names, which is what keeps
 * declared-order walkers from ever meeting it, and an id some ladder already holds is refused for
 * that same reason.
 */
export function gatewaySwitchingToConditional(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  judgeId: string,
  held: ConditionalSwitch,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) => {
    const writing = switchWriting(judgeId, held);

    if (writing === undefined || standsAsAChild(was, judgeId)) {
      return was;
    }

    const pointed = routerEdited(was, routerId, (router) => ({
      ...router,
      children: held.branches.map((branch) => branch.routeNodeId),
      policy: writing.policy,
    }));

    return { entry: pointed.entry, nodes: { ...pointed.nodes, [judgeId]: writing.judge } };
  });
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
 * The judge it replaces leaves with it, because a target no reference reaches is a table the stored
 * shape refuses. It stays where a second conditional router still asks it, the same rule a subtree
 * removal and a mode switch already weigh: a judge is held by every router naming it, so the last
 * of them to let go is the one that carries it out.
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
    const kept = judgeStillAsked(pointed, policy.judge)
      ? pointed
      : tableWithout(pointed, new Set([policy.judge]));

    return { entry: kept.entry, nodes: { ...kept.nodes, [judgeId]: judge } };
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
 * The gateway once one conditional router gives its judge a different length of time to answer.
 *
 * @summary The budget is the whole of what the field moves, so the judge, the branches, and the
 * else child stand exactly as they did. A length the stored shape would refuse leaves the table
 * alone rather than bouncing off the schema with a message written for a developer, and a judge
 * past its budget refuses the request rather than falling to the else branch (ADR-0158), so the
 * number a person writes here decides how long a slow judge is waited on and never where its
 * silence lands.
 */
export function gatewayJudgingWithin(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  judgeBoundMs: number,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) => {
    const policy = conditionalIn(was.nodes[routerId]);

    if (policy === undefined || !Number.isInteger(judgeBoundMs) || judgeBoundMs <= 0) {
      return was;
    }

    return routerEdited(was, routerId, (router) => ({
      ...router,
      policy: { ...policy, judgeBoundMs },
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
