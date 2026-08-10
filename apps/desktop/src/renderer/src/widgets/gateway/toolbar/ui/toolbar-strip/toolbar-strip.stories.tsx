import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { paintedStyle } from '../../../../../shared/testing';
import { ToolbarStrip } from './toolbar-strip';

function windowRegionOf(element: Element | null | undefined): string {
  return paintedStyle(element).getPropertyValue('-webkit-app-region');
}

const meta = preview.meta({
  component: ToolbarStrip,
  args: {
    address: 'http://localhost:51234',
    name: 'Codex',
    onRun: () => undefined,
    port: 51234,
    running: false,
    status: 'stopped' as const,
  },
  decorators: [
    (Story) => (
      <div className="bg-surface-toolbar">
        <Story />
      </div>
    ),
  ],
});

/**
 * The strip of one stopped gateway, whose run control offers the start.
 *
 * @summary The reading asks for the toolbar landmark under the gateway's own name and for the
 * start act, because every control in the strip acts on that one gateway and no other.
 */
export const Stopped = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('toolbar', { name: 'Codex' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Start' })).toBeVisible();
  },
});

/** The same strip while the gateway serves, whose run control offers the stop instead. */
export const Running = meta.story({
  args: { running: true, status: 'running' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Stop' })).toBeVisible();
  },
});

/**
 * The strip read as a title bar, whose bare surface moves the window and whose controls do not.
 *
 * @summary The window hides its own title bar, so the gaps between these controls are the only
 * place left to take hold of it. Every control has to take itself back out of that region, because
 * a drag region swallows every pointer event that lands on it, and a control left inside one reads
 * as broken.
 */
export const TakesHoldOfTheWindow = meta.story({
  play: async ({ canvas }) => {
    const strip = await canvas.findByRole('toolbar', { name: 'Codex' });
    const regions = [...strip.children].map(windowRegionOf);

    await expect(windowRegionOf(strip)).toBe('drag');
    await expect(regions).not.toHaveLength(0);
    await expect(new Set(regions)).toEqual(new Set(['no-drag']));
  },
});

/** The same strip in the dark scheme, where every raised control has to keep its edge. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
