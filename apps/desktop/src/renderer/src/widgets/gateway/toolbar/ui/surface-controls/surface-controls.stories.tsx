import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { closeLogsDrawer } from '../../../../../shared/lib';
import { paintedStyle } from '../../../../../shared/testing';
import { SurfaceControls } from './surface-controls';

const meta = preview.meta({
  beforeEach: () => {
    closeLogsDrawer();
  },
  component: SurfaceControls,
  decorators: [
    (Story) => (
      <div className="bg-surface-toolbar p-2.5">
        <Story />
      </div>
    ),
  ],
});

/** The pair the reference draws inside one border, rather than as two loose controls. */
export const Grouped = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const logs = await canvas.findByRole('button', { name: 'Request log' });
    const group = canvasElement.querySelector('span');

    await expect(await canvas.findByRole('button', { name: 'Inspector' })).toBeVisible();
    await expect(logs.parentElement).toBe(group);
    await expect(paintedStyle(group).borderTopWidth).toBe('1px');
  },
});

/** The group as a title bar reads it, where the controls take themselves out of the drag region. */
export const OutOfTheDragRegion = meta.story({
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('span');

    await expect(paintedStyle(group).getPropertyValue('-webkit-app-region')).toBe('no-drag');
  },
});

/** The log control while the drawer it opens stands, which it says out loud. */
export const RequestLogOpen = meta.story({
  play: async ({ canvas, userEvent }) => {
    const logs = await canvas.findByRole('button', { name: 'Request log' });

    await expect(logs).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(logs);
    await expect(logs).toHaveAttribute('aria-expanded', 'true');
  },
});
