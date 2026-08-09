import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox, paintedStyle } from '../../../../shared/testing';
import { inCanvasFlow, seat } from '../../testing/canvas-flow.testkit';
import { CanvasMinimap } from './canvas-minimap';

const seats = [
  seat('gateway', 'gateway', 'Gateway', { x: 0, y: 0 }),
  seat('model:sonnet', 'virtual-model', 'Sonnet', { x: 240, y: 0 }),
  seat('target:anthropic', 'target', 'Anthropic', { x: 480, y: 0 }),
  seat('draft', 'draft-model', 'Draft', { x: 240, y: 160 }),
  seat('ghost:openai', 'ghost-target', 'Gone', { x: 480, y: 160 }),
  seat('pending', 'pending-target', 'Pending', { x: 480, y: 320 }),
];

const cables = [
  { id: 'cable:sonnet', source: 'model:sonnet', target: 'target:anthropic' },
  { id: 'wire:model:sonnet', source: 'gateway', target: 'model:sonnet' },
];

const meta = preview.meta({
  component: CanvasMinimap,
  decorators: [inCanvasFlow(seats, { x: 20, y: 20, zoom: 0.5 }, cables)],
});

const mapLabel = { name: 'Canvas map' };

const gatewayChannels: [string, string] = [
  '0.0901961 0.52549 0.607843',
  '0.25098 0.784314 0.878431',
];
const modelChannels: [string, string] = ['0 0.478431 1', '0.0392157 0.517647 1'];
const targetChannels: [string, string] = ['0.686275 0.321569 0.870588', '0.74902 0.352941 0.94902'];

function forScheme(light: string, dark: string): string {
  return document.documentElement.classList.contains('scheme-dark') ? dark : light;
}

function roleTint(channels: [string, string], carried: string): string {
  return `color(srgb ${forScheme(...channels)} / ${carried})`;
}

/** The map in its corner, which is the whole of what a person glances at to place themselves. */
export const Basic = meta.story({});

/** The map takes the template's furniture card: its size, its radius, its wash, and its shadow. */
export const TheMapTakesTheFurnitureCard = meta.story({
  play: async ({ canvas }) => {
    const card = (await canvas.findByRole('img', mapLabel)).parentElement;
    const drawn = paintedBox(card);

    await expect(drawn.width).toBe(172);
    await expect(drawn.height).toBe(112);
    await expect(paintedStyle(card).borderRadius).toBe('9px');
    await expect(paintedStyle(card).backgroundColor).toBe(
      forScheme('rgba(255, 255, 255, 0.92)', 'rgba(30, 30, 33, 0.92)'),
    );
    await expect(paintedStyle(card).boxShadow).toContain('rgba(0, 0, 0, 0.4) 0px 4px 14px 0px');
  },
});

/** Whatever the viewport left behind reads washed, in the tone the standing scheme carries. */
export const TheMaskWashesWhatIsOffscreen = meta.story({
  play: async ({ canvas }) => {
    const drawing = await canvas.findByRole('img', mapLabel);

    await expect(paintedStyle(drawing.querySelector('path')).fill).toBe(
      forScheme('rgba(0, 0, 0, 0.055)', 'rgba(255, 255, 255, 0.055)'),
    );
  },
});

/** Every card draws in its own role tint, and one that is not real yet reads dimmed beside them. */
export const EachCardDrawsInItsRoleTint = meta.story({
  play: async ({ canvas }) => {
    const drawing = await canvas.findByRole('img', mapLabel);
    const drawn = [...drawing.querySelectorAll('rect')].map((rect) => paintedStyle(rect).fill);

    await expect(drawn).toEqual([
      roleTint(gatewayChannels, '0.85'),
      roleTint(modelChannels, '0.85'),
      roleTint(targetChannels, '0.85'),
      roleTint(modelChannels, '0.45'),
      roleTint(targetChannels, '0.45'),
      roleTint(targetChannels, '0.45'),
    ]);
  },
});

/** The map insets clear of the separator riding the canvas edge, so neither steals the other's drag. */
export const TheMapClearsTheSeparatorsReach = meta.story({
  play: async ({ canvas }) => {
    const card = (await canvas.findByRole('img', mapLabel)).parentElement;
    const separatorReach = 4;
    const inset = Number.parseFloat(paintedStyle(card).marginInlineEnd);

    await expect(inset).toBeGreaterThan(separatorReach);
    await expect(inset).toBe(16);
  },
});

/** The map draws the composition's cables beside its cards, the way the reference pictures it. */
export const TheMapDrawsTheCables = meta.story({
  play: async ({ canvas }) => {
    const map = await canvas.findByRole('img', mapLabel);
    const wires = [...map.querySelectorAll('path[vector-effect="non-scaling-stroke"]')];

    await expect(wires).toHaveLength(2);

    for (const wire of wires) {
      await expect(paintedStyle(wire).stroke).toBe(
        forScheme('rgba(0, 0, 0, 0.45)', 'rgba(255, 255, 255, 0.45)'),
      );
    }
  },
});

/** Dragging the map moves the viewport it pictures, so the corner steers the composition. */
export const DraggingTheMapMovesTheViewport = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const map = await canvas.findByRole('img', mapLabel);
    const viewport = canvasElement.querySelector<HTMLElement>('.react-flow__viewport');
    const resting = viewport?.style.transform ?? '';
    const box = paintedBox(map);
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const held = { bubbles: true, button: 0, clientX: middle.x, clientY: middle.y, view: window };
    const moved = { ...held, clientX: middle.x + 18, clientY: middle.y + 12 };

    map.dispatchEvent(new MouseEvent('mousedown', held));
    window.dispatchEvent(new MouseEvent('mousemove', moved));
    window.dispatchEvent(new MouseEvent('mouseup', moved));

    await waitFor(async () => {
      await expect(viewport?.style.transform ?? '').not.toBe(resting);
    });
  },
});
