import type { RouteTarget } from '@recompose/contracts';

import { routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { gatewayBindingChild, gatewayDroppingNode } from './routing-edits';
import {
  gatewayBindingJudge,
  gatewayJudgingEveryRequest,
  gatewayWritingBranch,
  routedThroughAConditionalRouter,
} from './routing-edits-conditional';
import { codex, judged, policyOf, routingOf, sharingOneJudge } from './routing-edits.testkit';

const judge: RouteTarget = { kind: 'target', accountId: 'a9', providerModel: 'claude-haiku-5' };

const catchAll: RouteTarget = { kind: 'target', accountId: 'a1', providerModel: 'claude-sonnet-5' };

function conditionalPolicyOf(gateway = judged(), routerId = 'r1') {
  const policy = policyOf(routingOf(gateway), routerId);

  return policy?.mode === 'conditional' ? policy : undefined;
}

test('a fresh conditional router stands over the one child that catches everything', () => {
  const routing = routedThroughAConditionalRouter(judge, catchAll);
  const policy = policyOf(routing, routing.entry);

  expect(policy).toMatchObject({ mode: 'conditional', branches: [], rejudgeEveryRequest: false });
  expect(policy?.mode === 'conditional' ? routing.nodes[policy.elseChild] : undefined).toEqual(
    catchAll,
  );
});

test('a fresh conditional router already holds the judge it was born with', () => {
  const routing = routedThroughAConditionalRouter(judge, catchAll);
  const policy = policyOf(routing, routing.entry);

  expect(policy?.mode === 'conditional' ? routing.nodes[policy.judge] : undefined).toEqual(judge);
});

test('a fresh conditional router stands as a table the stored shape will serve', () => {
  expect(routingSchema.safeParse(routedThroughAConditionalRouter(judge, catchAll)).success).toBe(
    true,
  );
});

test('two fresh conditional routers stand under ids of their own, judges and all', () => {
  const one = routedThroughAConditionalRouter(judge, catchAll);
  const other = routedThroughAConditionalRouter(judge, catchAll);

  const shared = Object.keys(one.nodes).filter((id) => Object.hasOwn(other.nodes, id));

  expect(shared).toEqual([]);
});

test('binding a judge points the router at a target the table now holds', () => {
  const bound = gatewayBindingJudge(judged(), 'fast', 'r1', 'j2', judge);
  const routing = routingOf(bound);

  expect(conditionalPolicyOf(bound)?.judge).toBe('j2');
  expect(routing.nodes['j2']).toEqual(judge);
  expect(routingSchema.safeParse(routing).success).toBe(true);
});

test('binding a second judge takes the one it replaced out of the table with it', () => {
  const bound = gatewayBindingJudge(judged(), 'fast', 'r1', 'j2', judge);

  expect(routingOf(bound).nodes['j1']).toBeUndefined();
});

test('rebinding the judge under the id it already answers to keeps it in the table', () => {
  const rebound = gatewayBindingJudge(judged(), 'fast', 'r1', 'j1', judge);

  expect(routingOf(rebound).nodes['j1']).toEqual(judge);
  expect(routingSchema.safeParse(routingOf(rebound)).success).toBe(true);
});

test('binding a second judge leaves the branches and the else child exactly as they stood', () => {
  const bound = gatewayBindingJudge(judged(), 'fast', 'r1', 'j2', judge);

  expect(conditionalPolicyOf(bound)).toMatchObject({
    branches: [{ label: 'code', rule: 'questions about source code', child: 'c1' }],
    elseChild: 'c2',
  });
});

test('a judge a surviving router still asks stays behind when one of them rebinds', () => {
  const shared = sharingOneJudge();
  const bound = gatewayBindingJudge(shared, 'fast', 'r1', 'j2', judge);

  expect(routingOf(bound).nodes['j1']).toEqual(routingOf(shared).nodes['j1']);
  expect(routingSchema.safeParse(routingOf(bound)).success).toBe(true);
});

test('the shared judge leaves once the second router asking it rebinds too', () => {
  const once = gatewayBindingJudge(sharingOneJudge(), 'fast', 'r1', 'j2', judge);
  const both = gatewayBindingJudge(once, 'fast', 'r2', 'j3', judge);

  expect(routingOf(both).nodes['j1']).toBeUndefined();
  expect(routingSchema.safeParse(routingOf(both)).success).toBe(true);
});

test('binding a judge under an id a child already answers to leaves the gateway as it stood', () => {
  const held = judged();

  expect(gatewayBindingJudge(held, 'fast', 'r1', 'c1', judge)).toEqual(held);
});

test('binding a judge onto a router that spreads some other way leaves the gateway as it stood', () => {
  expect(gatewayBindingJudge(codex, 'fast', 't1', 'j1', judge)).toEqual(codex);
});

test('moving the judging rhythm leaves the judge, the branches, and the else child alone', () => {
  const rejudging = gatewayJudgingEveryRequest(judged(), 'fast', 'r1', true);

  expect(conditionalPolicyOf(rejudging)).toEqual({
    ...conditionalPolicyOf(),
    rejudgeEveryRequest: true,
  });
  expect(routingSchema.safeParse(routingOf(rejudging)).success).toBe(true);
});

test('a router that spreads some other way has no rhythm to move', () => {
  expect(gatewayJudgingEveryRequest(codex, 'fast', 't1', true)).toEqual(codex);
});

test('writing a branch pairs a label and a rule with the child that answers to them', () => {
  const grown = gatewayBindingChild(judged(), 'fast', 'r1', 'c3', catchAll);
  const ruled = gatewayWritingBranch(grown, 'fast', 'r1', 'c3', {
    label: 'chat',
    rule: 'everyday conversation',
  });

  expect(conditionalPolicyOf(ruled)?.branches).toEqual([
    { label: 'code', rule: 'questions about source code', child: 'c1' },
    { label: 'chat', rule: 'everyday conversation', child: 'c3' },
  ]);
  expect(routingSchema.safeParse(routingOf(ruled)).success).toBe(true);
});

test('writing a branch again on the same child rewrites the one it already stood as', () => {
  const rewritten = gatewayWritingBranch(judged(), 'fast', 'r1', 'c1', {
    label: 'programming',
    rule: 'questions about source code or build failures',
  });

  expect(conditionalPolicyOf(rewritten)?.branches).toEqual([
    { label: 'programming', rule: 'questions about source code or build failures', child: 'c1' },
  ]);
});

test('a label reaches storage trimmed, because the judge answers with the word a person reads', () => {
  const ruled = gatewayWritingBranch(judged(), 'fast', 'r1', 'c1', {
    label: '  code review  ',
    rule: '  questions about diffs  ',
  });

  expect(conditionalPolicyOf(ruled)?.branches[0]).toEqual({
    label: 'code review',
    rule: 'questions about diffs',
    child: 'c1',
  });
});

test('a label another branch already wears is refused, so the judge never meets it twice', () => {
  const grown = gatewayBindingChild(judged(), 'fast', 'r1', 'c3', catchAll);

  expect(
    gatewayWritingBranch(grown, 'fast', 'r1', 'c3', { label: ' code ', rule: 'anything at all' }),
  ).toEqual(grown);
});

test('a branch holding no rule routes nothing, so a blank one is refused', () => {
  const held = judged();

  expect(gatewayWritingBranch(held, 'fast', 'r1', 'c1', { label: 'a label', rule: '  ' })).toEqual(
    held,
  );
});

test('the else child takes no label, because it catches what no label placed', () => {
  const held = judged();

  expect(
    gatewayWritingBranch(held, 'fast', 'r1', 'c2', { label: 'catch', rule: 'anything at all' }),
  ).toEqual(held);
});

test('a child the router does not hold takes no branch of its own', () => {
  const held = judged();

  expect(
    gatewayWritingBranch(held, 'fast', 'r1', 'j1', { label: 'judging', rule: 'anything at all' }),
  ).toEqual(held);
});

test('the else child cannot be dropped, because every conditional router carries one', () => {
  const held = judged();

  expect(gatewayDroppingNode(held, 'fast', 'c2')).toEqual(held);
});

test('the judge cannot be dropped, because a conditional router without one routes nothing', () => {
  const held = judged();

  expect(gatewayDroppingNode(held, 'fast', 'j1')).toEqual(held);
});

test('dropping a branch child takes the branch that named it away with it', () => {
  const dropped = gatewayDroppingNode(judged(), 'fast', 'c1');
  const routing = routingOf(dropped);

  expect(conditionalPolicyOf(dropped)?.branches).toEqual([]);
  expect(routing.nodes['c1']).toBeUndefined();
  expect(routingSchema.safeParse(routing).success).toBe(true);
});

test('dropping a child that held no branch leaves every branch standing as it stood', () => {
  const grown = gatewayBindingChild(judged(), 'fast', 'r1', 'c3', catchAll);
  const dropped = gatewayDroppingNode(grown, 'fast', 'c3');

  expect(conditionalPolicyOf(dropped)?.branches).toEqual([
    { label: 'code', rule: 'questions about source code', child: 'c1' },
  ]);
  expect(routingSchema.safeParse(routingOf(dropped)).success).toBe(true);
});
