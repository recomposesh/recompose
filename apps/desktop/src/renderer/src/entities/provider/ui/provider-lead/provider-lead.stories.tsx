import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedBox } from '../../../../shared/testing';
import { ProviderLead } from './provider-lead';

const meta = preview.meta({
  component: ProviderLead,
  args: { lead: { mark: 'anthropic' as const } },
});

/** A provider that publishes a mark leads with its own drawing rather than a glyph. */
export const AVendorMark = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')).not.toBeNull();
    await expect(canvasElement.querySelector('[data-glyph]')).toBeNull();
  },
});

/** A provider with no mark of its own leads with a glyph rather than an invented drawing. */
export const AGlyphWhereNoMarkExists = meta.story({
  args: { lead: { glyph: 'network' as const } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-glyph="network"]')).not.toBeNull();
  },
});

/** The glyph quiets to secondary ink, so a real mark's own colours still lead the row. */
export const TheGlyphQuiets = meta.story({
  args: { lead: { glyph: 'network' as const } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-glyph]')?.getAttribute('class')).toContain(
      'text-ink-secondary',
    );
  },
});

/** The surface around it sets the size, replacing the standing square rather than adding to it. */
export const TheSurfaceSetsTheSize = meta.story({
  args: { className: 'size-8' },
  play: async ({ canvasElement }) => {
    await expect(paintedBox(canvasElement.querySelector('svg')).width).toBe(32);
  },
});
