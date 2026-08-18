import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { fitsItsPane, narrowed } from '../../../../../shared/testing';
import { AddressPill } from './address-pill';

const meta = preview.meta({
  component: AddressPill,
  args: {
    address: 'http://127.0.0.1:51234',
    port: 51234,
    status: 'running' as const,
  },
  decorators: [
    (Story) => (
      <div className="flex w-160 bg-surface-toolbar p-4">
        <Story />
      </div>
    ),
  ],
});

/**
 * The address a running gateway answers on, with the way to copy it whole.
 *
 * @summary The reading asks for the address, the state word, and the copy control, because the
 * pill is the one place a person reads where the gateway serves and whether it is serving.
 */
export const Running = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('127.0.0.1:51234')).toBeVisible();
    await expect(await canvas.findByText('Running')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Copy address' })).toBeVisible();
  },
});

/** The same pill while the gateway is stopped, whose state word says so. */
export const Stopped = meta.story({
  args: { status: 'stopped' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Stopped')).toBeVisible();
  },
});

const WORD_STANDS_PX = 256;

const WORD_GONE_PX = 192;

const MARK_GONE_PX = 88;

/**
 * The pill against a narrowing strip, where the address gives way before anything leaves.
 *
 * @summary The address shortens to an ellipsis rather than losing glyphs off both edges. Once even
 * the ellipsis cannot buy room, the state word leaves, then the state mark, and the copy control
 * stands to the last, because handing over the whole address is the one act the pill owes at any
 * width.
 */
export const NarrowStrip = meta.story({
  decorators: [
    (Story) => (
      <div className="flex" data-pane="" style={{ width: WORD_STANDS_PX }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas, canvasElement }) => {
    const pane = canvasElement.querySelector('[data-pane]');
    const pill = pane?.querySelector('span.app-no-drag') ?? null;
    const word = await canvas.findByText('Running');

    await expect(word).toBeVisible();
    await expect(fitsItsPane(pill)).toBe(true);

    narrowed(pane, WORD_GONE_PX);
    await expect(word).not.toBeVisible();
    await expect(fitsItsPane(pill)).toBe(true);

    narrowed(pane, MARK_GONE_PX);
    await expect(fitsItsPane(pill)).toBe(true);
    await expect(await canvas.findByRole('button', { name: 'Copy address' })).toBeVisible();
  },
});

/** The same pill in the dark scheme, where the raised surface has to keep its edge. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
