import { describe, expect, test } from 'vitest';

import { escapeSettling, escapeThrowsTheDragAway, isEscape } from './canvas-standings';

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
  test('a quiet canvas lets go of the selection and its inspector', () => {
    expect(escapeSettling(quietCanvas)).toBe('canvas');
  });

  test('a cable mid-drag keeps Escape to itself, because it cancels its own', () => {
    expect(escapeSettling({ ...quietCanvas, dragging: true })).toBe('nobody');
  });

  test('a text field mid-edit keeps Escape to itself', () => {
    expect(escapeSettling({ ...quietCanvas, editing: true })).toBe('nobody');
  });

  test('an open dialog keeps Escape to itself, the binding ask among them', () => {
    expect(escapeSettling({ ...quietCanvas, dialogOpen: true })).toBe('nobody');
  });
});
