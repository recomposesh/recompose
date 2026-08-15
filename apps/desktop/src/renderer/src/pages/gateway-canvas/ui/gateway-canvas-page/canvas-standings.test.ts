import { describe, expect, test } from 'vitest';

import type { BindingOutcome } from '../../lib/cable-announcements';
import type { CanvasStandings, HeldStandings, PickerStanding } from './canvas-standings';

import { pendingMovedTo, pickedAccountId, standingsOver } from './canvas-standings';

const droppedAsk: PickerStanding = {
  step: 'account',
  from: 'draft',
  at: { x: 10, y: 20 },
  origin: 'drop',
};

const anchoredAsk: PickerStanding = {
  step: 'account',
  from: 'model:fast',
  anchor: 'target:fast',
};

const nothingStanding: HeldStandings = {
  selection: undefined,
  picker: undefined,
  removing: undefined,
  announced: undefined,
  refusal: undefined,
};

type StandingsWriting = {
  selection: (string | undefined)[];
  picker: (PickerStanding | undefined)[];
  removing: (string | undefined)[];
  announced: BindingOutcome[];
  refusal: (string | undefined)[];
};

function writingDown(held: HeldStandings): {
  standings: CanvasStandings;
  writing: StandingsWriting;
} {
  const writing: StandingsWriting = {
    selection: [],
    picker: [],
    removing: [],
    announced: [],
    refusal: [],
  };
  const standings = standingsOver(held, {
    writeSelection: (subject) => {
      writing.selection.push(subject);
    },
    writePicker: (standing) => {
      writing.picker.push(standing);
    },
    movePicker: (moved) => {
      writing.picker.push(moved(held.picker));
    },
    writeRemoving: (nodeId) => {
      writing.removing.push(nodeId);
    },
    writeAnnounced: (outcome) => {
      writing.announced.push(outcome);
    },
    writeRefusal: (sentence) => {
      writing.refusal.push(sentence);
    },
  });

  return { standings, writing };
}

describe('the pending card a binding ask stands on', () => {
  test('an ask holding its own point takes the point a drag carried it to', () => {
    expect(pendingMovedTo(droppedAsk, { x: 88, y: 99 })).toEqual({
      step: 'account',
      from: 'draft',
      at: { x: 88, y: 99 },
      origin: 'drop',
    });
  });

  test('an ask anchored to a stored card stays on the card it asks about', () => {
    expect(pendingMovedTo(anchoredAsk, { x: 88, y: 99 })).toEqual(anchoredAsk);
  });

  test('a drag over a canvas with no ask standing moves nothing into being', () => {
    expect(pendingMovedTo(undefined, { x: 88, y: 99 })).toBeUndefined();
  });
});

describe('what the canvas standings read as', () => {
  test('the five standings read back as they stand', () => {
    const { standings } = writingDown({
      selection: 'model:fast',
      picker: droppedAsk,
      removing: 'gateway',
      announced: { kind: 'released', virtualModel: 'Fast' },
      refusal: 'that port is taken',
    });

    expect(standings.selection).toBe('model:fast');
    expect(standings.picker).toEqual(droppedAsk);
    expect(standings.removing).toBe('gateway');
    expect(standings.announced).toEqual({ kind: 'released', virtualModel: 'Fast' });
    expect(standings.refusal).toBe('that port is taken');
  });
});

describe('choosing something, and hearing why something was refused', () => {
  test('choosing something new clears the refusal the person had stopped reading', () => {
    const { standings, writing } = writingDown({
      ...nothingStanding,
      refusal: 'that port is taken',
    });

    standings.select('model:fast');

    expect(writing.selection).toEqual(['model:fast']);
    expect(writing.refusal).toEqual([undefined]);
  });

  test('letting go of the selection clears the refusal the same way', () => {
    const { standings, writing } = writingDown({
      ...nothingStanding,
      refusal: 'that port is taken',
    });

    standings.select(undefined);

    expect(writing.selection).toEqual([undefined]);
    expect(writing.refusal).toEqual([undefined]);
  });

  test('a refusal lands twice: once out loud and once beside the inspector', () => {
    const { standings, writing } = writingDown(nothingStanding);

    standings.refuse(new Error('that port is taken'));

    expect(writing.announced).toEqual([{ kind: 'refused', refusal: 'that port is taken' }]);
    expect(writing.refusal).toEqual(['that port is taken']);
  });

  test('an outcome is said out loud without touching the refusal beside the inspector', () => {
    const { standings, writing } = writingDown(nothingStanding);

    standings.announce({ kind: 'bound', virtualModel: 'Fast', target: 'work' });

    expect(writing.announced).toEqual([{ kind: 'bound', virtualModel: 'Fast', target: 'work' }]);
    expect(writing.refusal).toEqual([]);
  });
});

describe('standing a binding ask and a removal question', () => {
  test('a drag carrying the pending card writes the ask on at its new point', () => {
    const { standings, writing } = writingDown({ ...nothingStanding, picker: droppedAsk });

    standings.movePendingTo({ x: 88, y: 99 });

    expect(writing.picker).toEqual([
      { step: 'account', from: 'draft', at: { x: 88, y: 99 }, origin: 'drop' },
    ]);
  });

  test('a binding ask is stood outright, since a drop already knows where it goes', () => {
    const { standings, writing } = writingDown(nothingStanding);

    standings.setPicker(droppedAsk);

    expect(writing.picker).toEqual([droppedAsk]);
  });

  test('asking a removal question stands it without disturbing anything else', () => {
    const { standings, writing } = writingDown(nothingStanding);

    standings.setRemoving('model:fast');

    expect(writing.removing).toEqual(['model:fast']);
    expect(writing.selection).toEqual([]);
  });
});

describe('the account the picker asks for models under', () => {
  test('the model stage asks under the account the person already picked', () => {
    expect(
      pickedAccountId({
        step: 'provider-model',
        from: 'draft',
        accountId: 'k1',
        at: { x: 0, y: 0 },
        origin: 'ask',
      }),
    ).toBe('k1');
  });

  test('the account stage asks under nobody, because nobody is picked yet', () => {
    expect(pickedAccountId(droppedAsk)).toBe('');
  });

  test('no ask standing asks under nobody at all', () => {
    expect(pickedAccountId(undefined)).toBe('');
  });
});
