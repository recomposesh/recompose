import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { SetupCables } from './setup-cables';

const meta = preview.meta({
  component: SetupCables,
  decorators: [
    (Story) => (
      <div className="relative h-95 w-full bg-surface-content">
        <Story />
      </div>
    ),
  ],
});

function paintedField(canvasElement: HTMLElement): SVGSVGElement {
  const field = canvasElement.querySelector('svg');

  if (!field) {
    throw new Error('The cable field drew nothing.');
  }

  return field;
}

/** The field the welcome step opens against, which says nothing and takes nothing. */
export const Basic = meta.story({
  play: async ({ canvasElement }) => {
    const field = paintedField(canvasElement);

    await expect(field).toHaveAttribute('aria-hidden', 'true');
    await expect(field.querySelectorAll('path')).toHaveLength(4);
  },
});

/** It never answers a pointer, so nothing behind it loses a click to the drawing. */
export const TakesNoPointer = meta.story({
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(paintedField(canvasElement)).pointerEvents).toBe('none');
  },
});
