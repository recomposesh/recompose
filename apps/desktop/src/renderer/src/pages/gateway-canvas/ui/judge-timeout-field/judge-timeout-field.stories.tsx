import { expect, fn } from 'storybook/test';

import { withInspectorPanel } from '#.storybook/inspector-panel';
import preview from '#.storybook/preview';

import { JudgeTimeoutField } from './judge-timeout-field';

const meta = preview.meta({
  component: JudgeTimeoutField,
  args: { judgeBoundMs: 30_000, onCommitBoundMs: fn() },
  decorators: [withInspectorPanel],
});

/** The stored wait reads back in the seconds a person wrote it in, never in milliseconds. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Judge timeout' })).toBeVisible();
    await expect(await canvas.findByRole('textbox', { name: 'Judge timeout' })).toHaveValue('30');
  },
});

/** The unit and the range stand under the field, so the number is never read bare. */
export const TheUnitStandsUnderTheField = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('textbox', { name: 'Judge timeout' }),
    ).toHaveAccessibleDescription('1 to 120 seconds');
  },
});

/** One sentence names the wait that stands and what a judge running past it costs the request. */
export const TheSentenceNamesTheWaitThatStands = meta.story({
  args: { judgeBoundMs: 45_000 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/waits up to 45 seconds on the judge/)).toBeVisible();
    await expect(await canvas.findByText(/refuses the request/)).toBeVisible();
  },
});

/** A one-second wait reads as one second rather than as a plural the number contradicts. */
export const ASingleSecondReadsSingular = meta.story({
  args: { judgeBoundMs: 1000 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/waits up to 1 second on the judge/)).toBeVisible();
  },
});

type TimeoutDriver = {
  canvas: { findByRole: (role: string, options: { name: string }) => Promise<HTMLElement> };
  userEvent: {
    clear: (element: Element) => Promise<void>;
    type: (element: Element, text: string) => Promise<void>;
  };
};

async function waitWritten(driver: TimeoutDriver, seconds: string): Promise<HTMLElement> {
  const field = await driver.canvas.findByRole('textbox', { name: 'Judge timeout' });

  await driver.userEvent.clear(field);
  await driver.userEvent.type(field, `${seconds}{Enter}`);

  return field;
}

/** A wait a person typed reaches storage in milliseconds, which is what the table holds. */
export const WritingAWaitAsksForItInMilliseconds = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    await waitWritten({ canvas, userEvent }, '45');

    await expect(args.onCommitBoundMs).toHaveBeenCalledWith(45_000);
  },
});

/** A wait past the ceiling never reaches storage, and the field falls back to what stands. */
export const AWaitPastTheCeilingIsRefused = meta.story({
  play: async ({ args, canvas, userEvent }) => {
    const field = await waitWritten({ canvas, userEvent }, '600');

    await expect(args.onCommitBoundMs).not.toHaveBeenCalled();
    await expect(field).toHaveValue('30');
  },
});

/** The field in the dark scheme, where its border has to separate from the panel behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
