import { describe, expect, test } from 'vitest';

import type { CanvasMenuAsks } from './canvas-menu-acts';

import { canvasMenuActs, canvasSubjectKind } from './canvas-menu-acts';
import { gateway } from './canvas-wiring.testkit';
import { worldWhereWritesHang } from './canvas-world.testkit';

type AsksRecord = { bound: string[]; released: string[]; asked: string[] };

function asksRecording(): CanvasMenuAsks & AsksRecord {
  const bound: string[] = [];
  const released: string[] = [];
  const asked: string[] = [];

  return {
    bound,
    released,
    asked,
    onAddVirtualModel: () => {
      asked.push('born');
    },
    onTidy: () => {
      asked.push('tidy');
    },
    onBindFrom: (from) => {
      bound.push(from);
    },
    onReleaseCable: (edgeId) => {
      released.push(edgeId);
    },
  };
}

function choose(subject: string | undefined, label: string) {
  const { acts, record, asks } = actsOn(subject);

  const act = acts.find((held) => held.label === label);

  if (act === undefined) {
    throw new Error(`${label} stands on no menu for ${subject ?? 'the canvas'}`);
  }

  act.onSelect();

  return { record, asks };
}

function actsOn(subject: string | undefined) {
  const { world, record } = worldWhereWritesHang(gateway);
  const asks = asksRecording();

  return { acts: canvasMenuActs(world, subject, asks), record, asks };
}

function labelsOn(subject: string | undefined): string[] {
  return actsOn(subject).acts.map((act) => act.label);
}

describe('what a right-click landed on', () => {
  test('nothing under the press is the canvas itself', () => {
    expect(canvasSubjectKind(undefined)).toBe('pane');
  });

  test('each card and cable is read by the name it already answers to', () => {
    expect(canvasSubjectKind('gateway')).toBe('gateway');
    expect(canvasSubjectKind('draft')).toBe('draft');
    expect(canvasSubjectKind('model:fast')).toBe('virtual-model');
    expect(canvasSubjectKind('target:fast')).toBe('target');
    expect(canvasSubjectKind('ghost:fast')).toBe('target');
    expect(canvasSubjectKind('route:fast/0')).toBe('router');
    expect(canvasSubjectKind('judge:fast')).toBe('judge');
    expect(canvasSubjectKind('cable:fast')).toBe('cable');
  });

  test('a name nobody taught this about reads as the canvas rather than as nothing', () => {
    expect(canvasSubjectKind('something-new')).toBe('pane');
  });
});

describe('the acts a subject offers', () => {
  test('the bare canvas offers to make a definition and to tidy what stands', () => {
    expect(labelsOn(undefined)).toEqual(['Add a virtual model', 'Tidy the canvas']);
  });

  test('the gateway card offers the acts that run its composition', () => {
    expect(labelsOn('gateway')).toEqual([
      'Add a virtual model',
      'Show in inspector',
      'Tidy the canvas',
      'Delete gateway…',
    ]);
  });

  test('a definition offers the target pick its own plus offers', () => {
    const { acts, asks } = actsOn('model:fast');

    acts[0]?.onSelect();

    expect(asks.bound).toEqual(['model:fast']);
  });

  test('a router offers to take one more provider under it', () => {
    const { acts, asks } = actsOn('route:fast/0');

    acts[0]?.onSelect();

    expect(asks.bound).toEqual(['route:fast/0']);
  });

  test('every subject offers at least one act, so no right-click opens an empty box', () => {
    const everySubject = [
      undefined,
      'gateway',
      'draft',
      'pending',
      'model:fast',
      'target:fast',
      'ghost:fast',
      'route:fast/0',
      'judge:fast',
      'cable:fast',
    ];

    for (const subject of everySubject) {
      expect(labelsOn(subject).length).toBeGreaterThan(0);
    }
  });
});

describe('the way out of a subject', () => {
  test('deleting a definition asks the question about that definition', () => {
    const { acts, record } = actsOn('model:fast');

    acts.at(-1)?.onSelect();

    expect(record.asked).toEqual(['model:fast']);
  });

  test('deleting the gateway asks the question about the gateway', () => {
    const { acts, record } = actsOn('gateway');

    acts.at(-1)?.onSelect();

    expect(record.asked).toEqual(['gateway']);
  });

  test('releasing a cable hands the cable to the release the Delete press runs', () => {
    const { acts, asks } = actsOn('cable:fast');

    acts.at(-1)?.onSelect();

    expect(asks.released).toEqual(['cable:fast']);
  });

  test('the way out reads as the destructive act it is', () => {
    expect(actsOn('gateway').acts.at(-1)?.tone).toBe('danger');
    expect(actsOn('model:fast').acts.at(-1)?.tone).toBe('danger');
    expect(actsOn('cable:fast').acts.at(-1)?.tone).toBe('danger');
  });
});

describe('choosing an act off a menu', () => {
  test('tidying from the canvas asks the arrangement the toolbar asks for', () => {
    expect(choose(undefined, 'Tidy the canvas').asks.asked).toEqual(['tidy']);
  });

  test('adding from the canvas stands a definition the way the gateway plus does', () => {
    expect(choose(undefined, 'Add a virtual model').asks.asked).toEqual(['born']);
  });

  test('showing a card puts the inspector on that card rather than on whatever stood', () => {
    expect(choose('model:fast', 'Show in inspector').record.selected).toEqual(['model:fast']);
  });

  test('removing a provider asks about the card standing at that binding', () => {
    expect(choose('target:fast', 'Remove provider…').record.asked).toEqual(['target:fast']);
  });

  test('discarding a draft asks the question the draft card already answers', () => {
    expect(choose('draft', 'Discard draft').record.asked).toEqual(['draft']);
  });

  test('a judge card shows in the inspector, which is where its directive is read', () => {
    expect(choose('judge:fast', 'Show in inspector').record.selected).toEqual(['judge:fast']);
  });

  test('a card waiting on a pick offers the tidy, so its menu is never empty', () => {
    expect(choose('pending', 'Tidy the canvas').asks.asked).toEqual(['tidy']);
  });
});
