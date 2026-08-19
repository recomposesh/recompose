import type { GatewayConfig } from '@recompose/contracts';

import { routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import type { ConditionalSwitch, JudgeBinding } from './conditional-draft';

import { switchBindingJudge, switchOpenedOn, switchRuling } from './conditional-draft';
import { gatewayRoutingThrough } from './routing-edits';
import { gatewaySwitchingToConditional } from './routing-edits-conditional';
import { childrenOf, codex, ladderOfThree, policyOf, routingOf } from './routing-edits.testkit';

function conditionalPolicyOf(gateway: GatewayConfig, routerId: string) {
  const policy = policyOf(routingOf(gateway), routerId);

  return policy?.mode === 'conditional' ? policy : undefined;
}

const judging: JudgeBinding = { accountId: 'a3', providerModel: 'claude-haiku-5' };

/** A failover ladder of three, its router id, and the children it declares, in that order. */
function spreadingLadder() {
  const three = ladderOfThree();
  const routerId = routingOf(three).entry;

  return { three, routerId, children: childrenOf(routingOf(three), routerId) };
}

/** That ladder read as a switch a save would take: every child but the last labelled and ruled. */
function wholeSwitch(children: readonly string[]): ConditionalSwitch {
  const ruled = switchRuling(switchOpenedOn(children), String(children[0]), {
    label: 'code',
    rule: 'questions about source code',
  });

  return switchBindingJudge(
    switchRuling(ruled, String(children[1]), { label: 'chat', rule: 'everything conversational' }),
    judging,
  );
}

/** The ladder as it stands once the switch it was walked through reaches storage. */
function switchedLadder() {
  const { three, routerId, children } = spreadingLadder();

  return {
    routerId,
    children,
    switched: gatewaySwitchingToConditional(three, 'fast', routerId, 'j9', wholeSwitch(children)),
  };
}

test('switching a stored router to conditional keeps its children and their order', () => {
  const { switched, routerId, children } = switchedLadder();

  expect(childrenOf(routingOf(switched), routerId)).toEqual(children);
});

test('the last declared child becomes the else, and every child above it becomes a branch', () => {
  const { switched, routerId, children } = switchedLadder();

  expect(conditionalPolicyOf(switched, routerId)).toMatchObject({
    branches: [
      { label: 'code', rule: 'questions about source code', child: children[0] },
      { label: 'chat', rule: 'everything conversational', child: children[1] },
    ],
    elseChild: children[2],
  });
});

test('the judge the switch bound joins the table as a target no children array names', () => {
  const { switched, routerId } = switchedLadder();
  const routing = routingOf(switched);

  expect(routing.nodes['j9']).toEqual({ kind: 'target', ...judging });
  expect(childrenOf(routing, routerId)).not.toContain('j9');
});

test('a switched router stands as a table the stored shape will serve', () => {
  expect(routingSchema.safeParse(routingOf(switchedLadder().switched)).success).toBe(true);
});

test('a switched router is born keeping the branch each conversation first earned', () => {
  const { switched, routerId } = switchedLadder();

  expect(conditionalPolicyOf(switched, routerId)?.rejudgeEveryRequest).toBe(false);
});

test('a switch the stored shape would refuse stores nothing, so the save never bounces', () => {
  const { three, routerId, children } = spreadingLadder();
  const half = { ...wholeSwitch(children), judge: undefined };

  expect(gatewaySwitchingToConditional(three, 'fast', routerId, 'j9', half)).toEqual(three);
});

test('a router holding no child has nothing to branch on, so the switch stores nothing', () => {
  const routed = gatewayRoutingThrough(codex, 'fast', 'failover');
  const routerId = routingOf(routed).entry;
  const empty = switchBindingJudge(switchOpenedOn([]), judging);

  expect(gatewaySwitchingToConditional(routed, 'fast', routerId, 'j9', empty)).toEqual(routed);
});

test('a judge under an id a child already answers to stores nothing, so no walk meets it', () => {
  const { three, routerId, children } = spreadingLadder();
  const onAChild = String(children[0]);

  expect(
    gatewaySwitchingToConditional(three, 'fast', routerId, onAChild, wholeSwitch(children)),
  ).toEqual(three);
});
