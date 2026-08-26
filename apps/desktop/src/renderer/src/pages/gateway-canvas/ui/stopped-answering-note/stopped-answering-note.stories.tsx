import type { Decorator } from '@storybook/react-vite';

import { expect, fn } from 'storybook/test';

import preview from '#.storybook/preview';

import { fitsItsPane, narrowed, paintedBox } from '../../../../shared/testing';
import { StoppedAnsweringNote } from './stopped-answering-note';

const GATEWAY = 'Codex';

const REASON = 'Nothing here asked it to stop, so requests are being refused.';

const WIDE_PANE = 'w-[64rem]';

const REASON_GONE_PX = 560;

const INSPECTOR_BESIDE_PX = 176;

function inTheColumn(pane: string): Decorator {
  return function ColumnAroundTheNote(Story) {
    return (
      <div className={`flex flex-col ${pane} bg-surface-content`} data-pane="">
        <div className="h-24 flex-1" data-stage="" />
        <Story />
      </div>
    );
  };
}

const meta = preview.meta({
  component: StoppedAnsweringNote,
  args: { gateway: GATEWAY, onPutAway: fn(), onStartAgain: fn() },
  decorators: [inTheColumn(WIDE_PANE)],
});

type Finds = {
  findByRole: (role: string, options: { name: string }) => Promise<HTMLElement>;
  findByText: (text: string | RegExp, options?: { exact: boolean }) => Promise<HTMLElement>;
};

/**
 * Everything the notice has to keep saying, whatever room it is given.
 *
 * @summary Two stories check the same reading, one at full width and one squeezed, so the list
 * lives here. A copy in each would let a pane width quietly drop one of them.
 */
async function theNoticeStillSays(canvas: Finds): Promise<void> {
  await expect(await canvas.findByText(`${GATEWAY} stopped answering`)).toBeVisible();
  await expect(await canvas.findByRole('button', { name: 'Start again' })).toBeVisible();
  await expect(await canvas.findByRole('button', { name: 'Dismiss' })).toBeVisible();
}

/**
 * The notice as a person meets it: what happened, why nothing explains it, and the way back.
 *
 * @summary Start again is the act, and the dismissal carries a label rather than a word, because
 * putting a notice away is the same gesture everywhere in the app and naming it twice would read
 * as two different ones.
 */
export const Standing = meta.story({
  play: async ({ canvas }) => {
    await theNoticeStillSays(canvas);
    await expect(await canvas.findByText(REASON, { exact: false })).toBeVisible();
  },
});

/**
 * The two acts the notice offers, each reaching the page that owns the gateway.
 *
 * @summary Pressing Start again asks for the gateway rather than putting the notice away, because
 * a notice that vanished on the press would leave a person watching nothing while the start ran.
 */
export const ActsPressed = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Start again' }));
    await expect(args.onStartAgain).toHaveBeenCalledTimes(1);
    await expect(args.onPutAway).not.toHaveBeenCalled();

    await userEvent.click(await canvas.findByRole('button', { name: 'Dismiss' }));
    await expect(args.onPutAway).toHaveBeenCalledTimes(1);
  },
});

/**
 * The notice standing in the column, taking its own band rather than covering the stage.
 *
 * @summary The stage ends where the notice begins, which is the whole reason it sits here: a save
 * that left a gateway down is read a moment after a card was edited, and a surface over the
 * composition would cover the card a person is about to press again.
 */
export const UnderTheStage = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const stage = canvasElement.querySelector('[data-stage]');
    const note = await canvas.findByRole('status');

    await expect(paintedBox(note).top).toBeGreaterThanOrEqual(paintedBox(stage).bottom);
    await expect(fitsItsPane(note)).toBe(true);
  },
});

/**
 * The notice against a narrowing pane, shedding the reason before it sheds anything else.
 *
 * @summary What happened and the way out are the last two standing, because a clipped sentence
 * reads as broken while a missing one reads as put away, and neither act may ever leave: a person
 * on the narrowest pane the layout survives still has to be able to start the gateway.
 */
export const NarrowPane = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const pane = canvasElement.querySelector('[data-pane]');
    const reason = await canvas.findByText(REASON, { exact: false });
    const note = await canvas.findByRole('status');

    await expect(reason).toBeVisible();

    narrowed(pane, REASON_GONE_PX);
    await expect(reason).not.toBeVisible();
    await expect(fitsItsPane(note)).toBe(true);

    narrowed(pane, INSPECTOR_BESIDE_PX);
    await theNoticeStillSays(canvas);
  },
});

/** The notice in the dark scheme, where its attention tint has to hold its own ground. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
