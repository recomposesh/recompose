import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { servedModels } from '../../model/served-models';
import { servingGateway, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { ServesBox } from './serves-box';

const serving = servedModels(servingGateway.virtualModels, storedAccounts.accounts);

const meta = preview.meta({
  component: ServesBox,
  args: { served: serving },
  decorators: [framedAsDrawerBox],
});

/** A gateway with virtual models on it, which is the box a person reads most of the time. */
export const Serving = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('list')).toBeVisible();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(serving.length);
  },
});

/**
 * Every binding the box holds reads whole at the width the inspector stands at.
 *
 * @summary A row telling a person to repair a binding has to say which binding it means, and the
 * longest one this gateway serves is the one that would run out of panel first, so the box is
 * measured against that row rather than against a name short enough to prove nothing.
 */
export const EveryBindingReadsWhole = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('openrouter · openai/gpt-5')).toBeVisible();

    const clipped = [...canvasElement.querySelectorAll<HTMLElement>('span.text-mono-value')].filter(
      (line) => line.scrollWidth > line.clientWidth,
    );

    await expect(clipped.map((line) => line.innerText)).toEqual([]);
  },
});

/**
 * A gateway serving nothing, which every gateway starts as.
 *
 * @summary The sentence names the cable gesture that adds the first virtual model, because a
 * button here would compete with the plus on the canvas rather than teach it.
 */
export const NothingServes = meta.story({
  args: { served: [] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Nothing serves yet')).toBeVisible();
    await expect(await canvas.findByText(/cable from the gateway/)).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Add virtual model' })).toBeNull();
  },
});

/** The box in the dark scheme, where every row has to separate from the panel behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
