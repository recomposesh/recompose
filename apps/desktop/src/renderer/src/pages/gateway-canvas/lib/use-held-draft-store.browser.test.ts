import { expect, test } from 'vitest';

import { emptyDefinition } from './model-draft';
import { heldDraft, leaveDrafting, startDrafting } from './use-held-draft';

const seat = { x: 320, y: 140 };

const drafted = {
  ...emptyDefinition(),
  displayName: 'Fast',
  id: 'fast',
};

function keyFor(slug: string): string {
  return `recompose.canvas.draft.${slug}`;
}

test('a draft a person began is written down for the next session', () => {
  startDrafting('kept-gw', drafted, seat);

  expect(localStorage.getItem(keyFor('kept-gw'))).toBe(
    JSON.stringify({ definition: drafted, seat }),
  );
});

test('a draft the last session wrote stands again', () => {
  localStorage.setItem(keyFor('reborn-gw'), JSON.stringify({ definition: drafted, seat }));

  expect(heldDraft('reborn-gw')).toEqual({ definition: drafted, seat });
});

test('a let-go draft leaves nothing written', () => {
  startDrafting('gone-gw', drafted, seat);
  leaveDrafting('gone-gw');

  expect(localStorage.getItem(keyFor('gone-gw'))).toBeNull();
});

test('a scrambled writing answers no draft rather than a broken one', () => {
  localStorage.setItem(keyFor('scrambled-gw'), '{"definition":{"displayName":7}}');

  expect(heldDraft('scrambled-gw')).toBeUndefined();
});
