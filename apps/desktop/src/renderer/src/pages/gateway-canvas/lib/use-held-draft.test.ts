import { beforeEach, expect, test } from 'vitest';

import { emptyDefinition } from './model-draft';
import {
  editDraft,
  heldDraft,
  leaveDrafting,
  moveDraftSeat,
  startDrafting,
  subscribeToHeldDrafts,
} from './use-held-draft';

const seat = { x: 320, y: 140 };

beforeEach(() => {
  leaveDrafting('my-gateway');
  leaveDrafting('other-gateway');
});

test('a gateway nobody drafted on holds no draft', () => {
  expect(heldDraft('my-gateway')).toBeUndefined();
});

test('a started draft stands with its definition and its seat', () => {
  startDrafting('my-gateway', emptyDefinition(), seat);

  expect(heldDraft('my-gateway')).toEqual({ definition: emptyDefinition(), seat });
});

test('the draft holds for its own gateway and no other', () => {
  startDrafting('my-gateway', emptyDefinition(), seat);

  expect(heldDraft('other-gateway')).toBeUndefined();
});

test('editing the draft keeps its seat', () => {
  startDrafting('my-gateway', emptyDefinition(), seat);
  editDraft('my-gateway', { ...emptyDefinition(), displayName: 'Fa', id: 'fa' });

  expect(heldDraft('my-gateway')).toEqual({
    definition: { displayName: 'Fa', id: 'fa', accountId: '', providerModel: '' },
    seat,
  });
});

test('an edit with no draft standing changes nothing', () => {
  editDraft('my-gateway', { ...emptyDefinition(), displayName: 'Fa' });

  expect(heldDraft('my-gateway')).toBeUndefined();
});

test('moving the draft keeps what a person typed', () => {
  startDrafting('my-gateway', { ...emptyDefinition(), displayName: 'Fa' }, seat);
  moveDraftSeat('my-gateway', { x: 10, y: 20 });

  expect(heldDraft('my-gateway')?.seat).toEqual({ x: 10, y: 20 });
  expect(heldDraft('my-gateway')?.definition.displayName).toBe('Fa');
});

test('moving a draft nobody started leaves the gateway holding none', () => {
  moveDraftSeat('my-gateway', { x: 10, y: 20 });

  expect(heldDraft('my-gateway')).toBeUndefined();
});

test('a gateway opened for the first time this session holds no draft', () => {
  expect(heldDraft('never-opened-gateway')).toBeUndefined();
});

test('leaving the draft lets it go entirely', () => {
  startDrafting('my-gateway', emptyDefinition(), seat);
  leaveDrafting('my-gateway');

  expect(heldDraft('my-gateway')).toBeUndefined();
});

test('readers hear about every draft change', () => {
  const heard: string[] = [];
  const letGo = subscribeToHeldDrafts(() => {
    heard.push('changed');
  });

  startDrafting('my-gateway', emptyDefinition(), seat);
  moveDraftSeat('my-gateway', { x: 1, y: 2 });
  leaveDrafting('my-gateway');
  letGo();
  startDrafting('my-gateway', emptyDefinition(), seat);

  expect(heard).toEqual(['changed', 'changed', 'changed']);
});
