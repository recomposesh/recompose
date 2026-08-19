import { expect, test } from 'vitest';

import type { ConditionalSwitch, JudgeBinding } from './conditional-draft';

import {
  switchBindingJudge,
  switchOpenedOn,
  switchReordering,
  switchRuling,
  switchWhole,
  switchWithout,
} from './conditional-draft';

const haiku: JudgeBinding = { accountId: 'a3', providerModel: 'claude-haiku-5' };

const THREE = ['c1', 'c2', 'c3'];

/** A switch over three children with the first two ruled, which is the whole a save waits for. */
function ruledSwitch(): ConditionalSwitch {
  const opened = switchRuling(switchOpenedOn(THREE), 'c1', {
    label: 'code',
    rule: 'questions about source code',
  });

  return switchBindingJudge(
    switchRuling(opened, 'c2', { label: 'chat', rule: 'everything conversational' }),
    haiku,
  );
}

test('a switch opens holding one draft branch per child, in the order the router declares them', () => {
  expect(switchOpenedOn(THREE).branches.map((branch) => branch.routeNodeId)).toEqual(THREE);
});

test('a switch opens with every branch blank, because inventing a word writes the judge a rule', () => {
  expect(switchOpenedOn(THREE).branches.every((branch) => branch.label === '')).toBe(true);
  expect(switchOpenedOn(THREE).branches.every((branch) => branch.rule === '')).toBe(true);
});

test('a switch opens naming no judge, which is the first answer it waits on', () => {
  expect(switchOpenedOn(THREE).judge).toBeUndefined();
});

test('a switch nobody bound a judge to is not whole, however well its branches read', () => {
  expect(switchWhole({ ...ruledSwitch(), judge: undefined })).toBe(false);
  expect(switchWhole({ ...ruledSwitch(), judge: { accountId: 'a3', providerModel: '' } })).toBe(
    false,
  );
});

test('a switch whose every non-else child holds a label and a rule is whole', () => {
  expect(switchWhole(ruledSwitch())).toBe(true);
});

test('the last declared child stands as else, so it is whole holding no label and no rule', () => {
  const held = ruledSwitch();

  expect(held.branches.at(-1)).toMatchObject({ routeNodeId: 'c3', label: '', rule: '' });
});

test('a branch missing its label holds the switch shut, because the judge would have no word', () => {
  expect(switchWhole(switchRuling(ruledSwitch(), 'c1', { label: '  ', rule: 'still here' }))).toBe(
    false,
  );
});

test('a branch missing its rule holds the switch shut, because the word would mean nothing', () => {
  expect(switchWhole(switchRuling(ruledSwitch(), 'c2', { label: 'chat', rule: '   ' }))).toBe(
    false,
  );
});

test('two branches answering to one label hold the switch shut, once both are trimmed', () => {
  const clashing = switchRuling(ruledSwitch(), 'c2', { label: ' code ', rule: 'also code' });

  expect(switchWhole(clashing)).toBe(false);
});

test('ruling a branch writes those words on that child and leaves every sibling alone', () => {
  const ruled = switchRuling(ruledSwitch(), 'c1', { label: 'source', rule: 'anything with code' });

  expect(ruled.branches[0]).toMatchObject({ label: 'source', rule: 'anything with code' });
  expect(ruled.branches[1]).toMatchObject({ label: 'chat', rule: 'everything conversational' });
});

test('ruling a child this switch does not hold leaves every branch exactly as it stood', () => {
  const held = ruledSwitch();

  expect(switchRuling(held, 'c9', { label: 'nope', rule: 'nowhere' }).branches) //
    .toEqual(held.branches);
});

test('binding a judge leaves the branches exactly as they stood, since only the reader moved', () => {
  const held = ruledSwitch();
  const rebound = switchBindingJudge(held, { accountId: 'a4', providerModel: 'gpt-5-mini' });

  expect(rebound.judge).toEqual({ accountId: 'a4', providerModel: 'gpt-5-mini' });
  expect(rebound.branches).toEqual(held.branches);
});

test('a router holding one child is whole once a judge binds, since that child is the else', () => {
  expect(switchWhole(switchBindingJudge(switchOpenedOn(['c1']), haiku))).toBe(true);
});

test('moving a branch carries the words written on it, so a person orders what they wrote', () => {
  const moved = switchReordering(ruledSwitch(), 0, 2);

  expect(moved.branches.map((branch) => branch.routeNodeId)).toEqual(['c2', 'c3', 'c1']);
  expect(moved.branches.at(-1)).toMatchObject({ label: 'code' });
});

test('moving a branch to the end hands it the else, which is what the last row stands as', () => {
  const moved = switchReordering(ruledSwitch(), 0, 2);

  expect(switchWhole(moved)).toBe(false);
});

test('a move naming a rank no row holds leaves every branch exactly where it stood', () => {
  const held = ruledSwitch();

  expect(switchReordering(held, 9, 0).branches).toEqual(held.branches);
  expect(switchReordering(held, 0, 9).branches).toEqual(held.branches);
});

test('a child that leaves takes the words written about it with it', () => {
  const dropped = switchWithout(ruledSwitch(), 'c1');

  expect(dropped.branches.map((branch) => branch.routeNodeId)).toEqual(['c2', 'c3']);
});

test('a child that leaves takes no judge with it, since the reader answers for all of them', () => {
  expect(switchWithout(ruledSwitch(), 'c1').judge).toEqual(haiku);
});
