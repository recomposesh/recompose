import { describe, expect, test } from 'vitest';

import type { PickerStanding } from './canvas-standings';

import { escapeSettling, escapeThrowsTheDragAway, isEscape } from './canvas-standings';

const droppedAsk: PickerStanding = {
  step: 'account',
  from: 'draft',
  at: { x: 10, y: 20 },
  origin: 'drop',
};

const quietCanvas = { dragging: false, editing: false, dialogOpen: false };

describe('the key that puts the most recent thing away', () => {
  test('Escape is the key the canvas settles on', () => {
    expect(isEscape('Escape')).toBe(true);
  });

  test('any other key belongs to whatever else is listening', () => {
    expect(isEscape('Enter')).toBe(false);
  });
});

describe('a cable drag Escape asks to throw away', () => {
  test('Escape with a cable hanging throws that drag away', () => {
    expect(escapeThrowsTheDragAway('Escape', { inFlight: true, escaped: false })).toBe(true);
  });

  test('Escape with nothing in flight throws nothing away', () => {
    expect(escapeThrowsTheDragAway('Escape', { inFlight: false, escaped: false })).toBe(false);
  });

  test('another key leaves a hanging cable exactly where it hangs', () => {
    expect(escapeThrowsTheDragAway('Enter', { inFlight: true, escaped: false })).toBe(false);
  });
});

describe('what one Escape press settles on the canvas', () => {
  test('a binding ask in flight dismisses alone, ahead of the selection', () => {
    expect(escapeSettling(droppedAsk, quietCanvas)).toBe('picker');
  });

  test('a quiet canvas lets go of the selection and its inspector', () => {
    expect(escapeSettling(undefined, quietCanvas)).toBe('canvas');
  });

  test('a cable mid-drag keeps Escape to itself, because it cancels its own', () => {
    expect(escapeSettling(undefined, { ...quietCanvas, dragging: true })).toBe('nobody');
  });

  test('a text field mid-edit keeps Escape to itself', () => {
    expect(escapeSettling(undefined, { ...quietCanvas, editing: true })).toBe('nobody');
  });

  test('an open dialog keeps Escape to itself, even with a binding ask standing', () => {
    expect(escapeSettling(droppedAsk, { ...quietCanvas, dialogOpen: true })).toBe('nobody');
  });
});
