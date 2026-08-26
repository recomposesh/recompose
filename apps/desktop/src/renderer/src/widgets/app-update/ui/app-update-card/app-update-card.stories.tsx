import { expect } from 'storybook/test';

import preview from '#.storybook/preview';
import { withSidebarSurface } from '#.storybook/sidebar-surface';

import { AppUpdateCard } from './app-update-card';

const readyBridge = {
  overrides: {
    'updates:get': async () =>
      Promise.resolve({
        ok: true as const,
        value: {
          standing: 'ready' as const,
          version: '0.4.0',
          check: { standing: 'current' as const },
        },
      }),
  },
};

const meta = preview.meta({
  component: AppUpdateCard,
  parameters: { bridge: readyBridge },
  decorators: [withSidebarSurface],
});

/**
 * A downloaded version standing over the report of the check that found it.
 *
 * @summary Both answers reach the card here, and record 0200 says one of them stands. The version
 * line doubles as the proof of the wiring: the running version arrives from the system query and
 * the waiting one from the updates query, so a swap at the call site would read backwards. What
 * the card itself draws belongs to the ReadyToRestart story.
 */
export const Ready = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('0.3.0 → 0.4.0')).toBeVisible();
    await expect(canvas.queryByText('Up to date')).not.toBeInTheDocument();
  },
});

/** A check the person asked for, standing in the slot the ready card would have taken. */
export const CheckAsked = meta.story({
  parameters: {
    bridge: {
      overrides: {
        'updates:get': async () =>
          Promise.resolve({
            ok: true as const,
            value: { standing: 'quiet' as const, check: { standing: 'current' as const } },
          }),
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Up to date')).toBeVisible();
    await expect(await canvas.findByText('Recompose 0.3.0 is the newest version.')).toBeVisible();
  },
});

/**
 * A quiet channel, which is most sessions: the card renders nothing at all.
 *
 * @summary No play function runs here, because the story shows an absence and an absence assertion
 * would need a settle point this component never provides.
 */
export const NothingWaiting = meta.story({
  parameters: {
    bridge: {
      overrides: {
        'updates:get': async () =>
          Promise.resolve({ ok: true as const, value: { standing: 'quiet' as const } }),
      },
    },
  },
});
