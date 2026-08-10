import type { Account } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { servedRequest, workKey } from '../../testing/gateway-canvas.testkit';
import { LogRow } from './log-row';

const meta = preview.meta({
  component: LogRow,
  args: { logged: servedRequest(), account: workKey, id: 'served-1' },
  decorators: [
    (Story) => (
      <div
        aria-label="Requests"
        className="mx-auto my-4 w-160 rounded-control bg-surface-card"
        role="listbox"
      >
        <Story />
      </div>
    ),
  ],
});

function inkOf(cell: Element): string {
  return getComputedStyle(cell).color;
}

/**
 * The three standings down one run, which is the arrangement both ink stories are read against.
 *
 * @summary Every ink question needs all three side by side, so the arrangement lives here once and
 * each story says only which scheme it reads in and whether the failed row's account still stands.
 */
function threeStandings(failedThrough: Account | undefined) {
  return (
    <>
      <LogRow account={workKey} id="served" logged={servedRequest()} />
      <LogRow account={workKey} id="limited" logged={servedRequest({ status: 429 })} />
      <LogRow
        account={failedThrough}
        id="failed"
        logged={servedRequest({ status: 500, durationMs: undefined })}
      />
    </>
  );
}

/** A request that was served, which is the row a person reads most of the time. */
export const Served = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('14:22:09')).toBeVisible();
    await expect(await canvas.findByText('anthropic · work')).toBeVisible();
    await expect(await canvas.findByText('0.9s')).toBeVisible();
  },
});

/**
 * The three standings side by side, where each status paints its own ink.
 *
 * @summary Color never carries the meaning alone here: the digits say it, and this story holds the
 * three inks to being three, so a scheme that flattened two of them together would be caught.
 */
export const EveryStanding = meta.story({
  render: () => threeStandings(workKey),
  play: async ({ canvas }) => {
    const inks = [
      inkOf(await canvas.findByText('200')),
      inkOf(await canvas.findByText('429')),
      inkOf(await canvas.findByText('500')),
    ];

    await expect(new Set(inks).size).toBe(3);
  },
});

/** A request the provider refused, whose duration cell stays empty rather than reading zero. */
export const Failed = meta.story({
  args: {
    logged: servedRequest({
      status: 500,
      durationMs: undefined,
      failure: 'The provider answered 500.',
    }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('no duration')).toBeInTheDocument();
  },
});

/** A request the gateway raised before any provider answered, whose provider cells stay empty. */
export const RaisedByTheGateway = meta.story({
  args: {
    logged: servedRequest({
      origin: 'gateway',
      provider: undefined,
      accountId: undefined,
      providerModel: undefined,
      status: 502,
      durationMs: undefined,
      failure: 'No target answered.',
    }),
    account: undefined,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('502')).toBeVisible();
  },
});

/** A request served through an account since gone, printing the raw id in the ghost ink. */
export const AccountDeparted = meta.story({
  args: { account: undefined },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('anthropic · k1')).toBeVisible();
  },
});

/** The long names a person meets in practice, where the provider model gives way first. */
export const NamesTooLongForTheGrid = meta.story({
  args: {
    logged: servedRequest({
      virtualModel: 'creative-writing-assistant',
      providerModel: 'anthropic/claude-sonnet-5-20260501-extended-thinking',
    }),
  },
  play: async ({ canvas }) => {
    const resolved = await canvas.findByText(
      'anthropic/claude-sonnet-5-20260501-extended-thinking',
    );

    await expect(resolved).toHaveAttribute(
      'title',
      'anthropic/claude-sonnet-5-20260501-extended-thinking',
    );
    await expect(resolved.scrollWidth).toBeGreaterThan(resolved.clientWidth);
  },
});

/** The row the cursor rests on, which is the one a copy takes. */
export const UnderTheCursor = meta.story({
  args: { underCursor: true },
});

/** The three standings in the dark scheme, where each ink has to hold against the card. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  render: () => threeStandings(undefined),
});
