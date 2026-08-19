import { expect, test } from 'vitest';

import type { RouterChild } from '../router-child-list/router-child';

import {
  switchBindingJudge,
  switchOpenedOn,
  switchReordering,
  switchRuling,
} from '../../lib/conditional-draft';
import { switchDefinitionRows } from './switch-rows';

const three: readonly RouterChild[] = [
  { routeNodeId: 'c1', cardId: 'target:fast@c1', name: 'work', detail: 'claude-sonnet-5' },
  { routeNodeId: 'c2', cardId: 'target:fast@c2', name: 'spare', detail: 'claude-opus-5' },
  { routeNodeId: 'c3', cardId: 'target:fast@c3', name: 'Ollama', detail: 'qwen3' },
];

const opened = switchOpenedOn(['c1', 'c2', 'c3']);

const ruled = switchRuling(opened, 'c1', {
  label: 'code',
  rule: 'questions about source code',
});

test('every existing child arrives as a row a person can still reach and open', () => {
  expect(switchDefinitionRows(three, opened).map((row) => row.name)) //
    .toEqual(['work', 'spare', 'Ollama']);
});

test('a branch nobody has worded yet arrives blank, so no row claims a rule nobody wrote', () => {
  expect(switchDefinitionRows(three, opened)[0]).toMatchObject({ label: '', rule: '' });
});

test('a branch a person worded reads back the label and the rule they wrote', () => {
  expect(switchDefinitionRows(three, ruled)[0]).toMatchObject({
    label: 'code',
    rule: 'questions about source code',
  });
});

test('the last declared child stands as the else row and says why it stays', () => {
  const held = switchDefinitionRows(three, ruled).at(-1);

  expect(held?.label).toBe('Else');
  expect(held?.inertReason).toContain('else branch');
});

test('the else row carries no rule, because it catches exactly what no rule placed', () => {
  expect(switchDefinitionRows(three, ruled).at(-1)?.rule).toBeUndefined();
});

test('a judge bound partway through changes no row, since only the reader moved', () => {
  const judged = switchBindingJudge(ruled, { accountId: 'a3', providerModel: 'claude-haiku-5' });

  expect(switchDefinitionRows(three, judged)).toEqual(switchDefinitionRows(three, ruled));
});

test('the rows read in the order the definition arranged them, so a move reads as it landed', () => {
  const moved = switchReordering(ruled, 0, 2);

  expect(switchDefinitionRows(three, moved).map((row) => row.name)) //
    .toEqual(['spare', 'Ollama', 'work']);
  expect(switchDefinitionRows(three, moved).at(-1)?.label).toBe('Else');
});

test('a child the ladder no longer holds stands no row, since there is no binding to open', () => {
  expect(switchDefinitionRows(three.slice(0, 2), opened).map((row) => row.name)) //
    .toEqual(['work', 'spare']);
});

test('a router holding one child offers it as the else alone, with nothing left to word', () => {
  const alone = three.slice(0, 1);

  expect(switchDefinitionRows(alone, switchOpenedOn(['c1']))).toMatchObject([{ label: 'Else' }]);
});
