import type { GatewayConfig } from '@recompose/contracts';

import { routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import type { ConditionalSwitch, JudgeBinding } from './conditional-draft';

import {
  switchBindingJudge,
  switchOpenedOn,
  switchReordering,
  switchRuling,
} from './conditional-draft';
import { gatewayRoutingThrough, gatewaySwitching } from './routing-edits';
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

/**
 * The same switch once a save would take it: a judge bound, and every child but the last worded.
 *
 * @summary It words whichever rows currently owe words rather than fixed ids, because moving a row
 * to the end hands it the else and takes its words out of the count.
 */
function worded(held: ConditionalSwitch): ConditionalSwitch {
  const owing = held.branches.slice(0, -1).map((branch) => branch.routeNodeId);
  const ruled = switchRuling(
    switchRuling(held, String(owing[0]), {
      label: 'code',
      rule: 'questions about source code',
    }),
    String(owing[1]),
    { label: 'chat', rule: 'everything conversational' },
  );

  return switchBindingJudge(ruled, judging);
}

function wholeSwitch(children: readonly string[]): ConditionalSwitch {
  return worded(switchOpenedOn(children));
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

test('the children follow the order the definition arranged them in, so the else reads last', () => {
  const { three, routerId, children } = spreadingLadder();
  const arranged = worded(switchReordering(switchOpenedOn(children), 0, 2));
  const switched = gatewaySwitchingToConditional(three, 'fast', routerId, 'j9', arranged);

  expect(childrenOf(routingOf(switched), routerId)).toEqual([
    children[1],
    children[2],
    children[0],
  ]);
  expect(conditionalPolicyOf(switched, routerId)?.elseChild).toBe(children[0]);
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

test('switching a conditional router back to failover keeps its children in declared order', () => {
  const { switched, routerId, children } = switchedLadder();
  const spread = gatewaySwitching(switched, 'fast', routerId, 'failover');

  expect(childrenOf(routingOf(spread), routerId)).toEqual(children);
  expect(policyOf(routingOf(spread), routerId)).toEqual({ mode: 'failover' });
});

test('switching a conditional router to round-robin takes the same children the same way', () => {
  const { switched, routerId, children } = switchedLadder();
  const spread = gatewaySwitching(switched, 'fast', routerId, 'round-robin');

  expect(childrenOf(routingOf(spread), routerId)).toEqual(children);
  expect(policyOf(routingOf(spread), routerId)).toEqual({ mode: 'round-robin' });
});

test('the judge leaves the table with the wording, since no policy would reference it', () => {
  const { switched, routerId } = switchedLadder();
  const spread = gatewaySwitching(switched, 'fast', routerId, 'failover');

  expect(routingOf(spread).nodes['j9']).toBeUndefined();
});

test('a router switched away from conditional stands as a table the stored shape will serve', () => {
  const { switched, routerId } = switchedLadder();
  const spread = gatewaySwitching(switched, 'fast', routerId, 'failover');

  expect(routingSchema.safeParse(routingOf(spread)).success).toBe(true);
});
