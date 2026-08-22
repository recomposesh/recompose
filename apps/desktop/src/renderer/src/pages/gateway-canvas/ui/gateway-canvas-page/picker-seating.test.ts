import { describe, expect, test } from 'vitest';

import type { PickerStanding } from './canvas-standings';

import { gateway } from './canvas-wiring.testkit';
import { worldWhereWritesHang } from './canvas-world.testkit';
import { pickerOnCanvas } from './picker-on-canvas';
import { droppedAt, modelsOffered, storedAccounts } from './picker-on-canvas.testkit';

const droppedAsk: PickerStanding = { step: 'kind', from: 'draft', at: droppedAt, origin: 'drop' };

function seatOfThePicker(seats: Record<string, { x: number; y: number }>) {
  const { world } = worldWhereWritesHang(gateway, {
    accounts: storedAccounts,
    picker: droppedAsk,
    seats,
  });

  return pickerOnCanvas(world, modelsOffered)?.anchorSeat;
}

describe('where a picker stands while the card it anchors to is still arriving', () => {
  test('it opens at the point the ask named, never at the corner of the canvas', () => {
    expect(seatOfThePicker({})).toEqual(droppedAt);
  });

  test('it follows the card once that card has a seat of its own', () => {
    const seated = { x: 640, y: 320 };

    expect(seatOfThePicker({ pending: seated })).toEqual(seated);
  });
});
