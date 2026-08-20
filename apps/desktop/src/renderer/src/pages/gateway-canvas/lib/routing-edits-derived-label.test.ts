import type { RouteTarget } from '@recompose/contracts';

import { routingSchema } from '@recompose/contracts';
import { expect, test } from 'vitest';

import { gatewayBindingChild } from './routing-edits';
import { gatewayWritingBranch } from './routing-edits-conditional';
import { judged, policyOf, routingOf } from './routing-edits.testkit';

const spare: RouteTarget = { kind: 'target', accountId: 'a4', providerModel: 'claude-opus-5' };

function branchesOf(gateway = judged(), routerId = 'r1') {
  const policy = policyOf(routingOf(gateway), routerId);

  return policy?.mode === 'conditional' ? policy.branches : undefined;
}

function aSecondBranchRuled(rule: string, label = '') {
  const grown = gatewayBindingChild(judged(), 'fast', 'r1', 'c3', spare);

  return gatewayWritingBranch(grown, 'fast', 'r1', 'c3', { label, rule });
}

test('a branch saved with no label of its own wears one drawn from its rule', () => {
  expect(branchesOf(aSecondBranchRuled('questions about billing'))?.at(-1)).toEqual({
    label: 'questions about billing',
    rule: 'questions about billing',
    child: 'c3',
  });
});

test('a label drawn from a rule reaches storage the stored shape accepts', () => {
  expect(
    routingSchema.safeParse(routingOf(aSecondBranchRuled('questions about billing'))).success,
  ).toBe(true);
});

test('a label a person typed stands, so the rule is never drawn from over their word', () => {
  expect(branchesOf(aSecondBranchRuled('questions about billing', 'billing'))?.at(-1)?.label).toBe(
    'billing',
  );
});

test('a label drawn from a rule stands clear of the word a sibling branch already wears', () => {
  expect(branchesOf(aSecondBranchRuled('code'))?.at(-1)?.label).toBe('code 2');
});

test('a rule longer than a label is cut at a word before it reaches storage', () => {
  expect(
    branchesOf(aSecondBranchRuled('anything at all about invoices and refunds'))?.at(-1),
  ).toEqual({
    label: 'anything at all about',
    rule: 'anything at all about invoices and refunds',
    child: 'c3',
  });
});

test('a rewrite that blanks the label draws a fresh one rather than clashing with itself', () => {
  const rewritten = gatewayWritingBranch(judged(), 'fast', 'r1', 'c1', {
    label: '',
    rule: 'questions about diffs',
  });

  expect(branchesOf(rewritten)?.[0]).toEqual({
    label: 'questions about diffs',
    rule: 'questions about diffs',
    child: 'c1',
  });
});

test('a branch holding neither label nor rule stays blank, since no rule stands to draw from', () => {
  const grown = gatewayBindingChild(judged(), 'fast', 'r1', 'c3', spare);

  expect(gatewayWritingBranch(grown, 'fast', 'r1', 'c3', { label: '', rule: '   ' })).toEqual(
    grown,
  );
});
