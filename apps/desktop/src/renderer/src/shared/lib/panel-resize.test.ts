import { expect, test } from 'vitest';

import { draggedPanel, panelBounds, restoredPanel, steppedPanel } from './panel-resize';

const bounds = panelBounds.inspector;

test('a width inside the bounds is taken as it stands', () => {
  expect(draggedPanel(340, bounds)).toEqual({ standing: 'sized', width: 340 });
});

test('a drag beyond the widest the panel may stand stops at that width', () => {
  expect(draggedPanel(2000, bounds)).toEqual({ standing: 'sized', width: bounds.max });
});

test('a drag under the narrowest width holds there rather than shrinking further', () => {
  expect(draggedPanel(bounds.min - 8, bounds)).toEqual({ standing: 'sized', width: bounds.min });
});

test('a drag well past the narrowest width collapses the panel instead', () => {
  expect(draggedPanel(bounds.min - bounds.collapseBelow, bounds)).toEqual({
    standing: 'collapsed',
  });
});

test('a drag to nothing collapses, because a person dragged it shut', () => {
  expect(draggedPanel(0, bounds)).toEqual({ standing: 'collapsed' });
});

test('a step widens the panel by one step, and never past the widest', () => {
  expect(steppedPanel(340, 1, bounds)).toBe(340 + bounds.step);
  expect(steppedPanel(bounds.max, 1, bounds)).toBe(bounds.max);
});

test('a step narrows the panel by one step, and never under the narrowest', () => {
  expect(steppedPanel(340, -1, bounds)).toBe(340 - bounds.step);
  expect(steppedPanel(bounds.min, -1, bounds)).toBe(bounds.min);
});

test('every panel carries its own bounds, with room to stand between them', () => {
  for (const [name, sized] of Object.entries(panelBounds)) {
    expect(sized.min, name).toBeLessThan(sized.max);
  }
});

test('every panel stands at a size its own bounds allow', () => {
  for (const [name, sized] of Object.entries(panelBounds)) {
    expect(sized.standing, name).toBeGreaterThanOrEqual(sized.min);
    expect(sized.standing, name).toBeLessThanOrEqual(sized.max);
  }
});

test('the logs drawer sizes along its own axis, deeper than a panel edge and short of the stage', () => {
  expect(panelBounds.logs).toEqual({
    min: 160,
    max: 480,
    collapseBelow: 48,
    step: 16,
    standing: 280,
  });
});

test('a drag well under the logs drawer shuts it, the way it shuts the side panels', () => {
  const logs = panelBounds.logs;

  expect(draggedPanel(logs.min - logs.collapseBelow, logs)).toEqual({ standing: 'collapsed' });
  expect(draggedPanel(logs.standing, logs)).toEqual({ standing: 'sized', width: logs.standing });
});

test('a drag out of a shut panel brings it back once it has gone far enough to mean it', () => {
  expect(restoredPanel(bounds.collapseBelow, bounds)).toBe(true);
  expect(restoredPanel(bounds.collapseBelow + 200, bounds)).toBe(true);
});

test('a nudge out of a shut panel leaves it shut, so a stray pointer never reopens it', () => {
  expect(restoredPanel(0, bounds)).toBe(false);
  expect(restoredPanel(bounds.collapseBelow - 1, bounds)).toBe(false);
  expect(restoredPanel(-200, bounds)).toBe(false);
});
