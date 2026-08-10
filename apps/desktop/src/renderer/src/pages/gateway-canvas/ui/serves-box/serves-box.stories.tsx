import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { servedModels } from '../../model/served-models';
import { servingGateway, storedAccounts } from '../../testing/gateway-canvas.testkit';
import { ServesBox } from './serves-box';

const serving = servedModels(servingGateway.virtualModels, storedAccounts.accounts);

const meta = preview.meta({
  component: ServesBox,
  args: { served: serving },
  decorators: [
    (Story) => (
      <div className="mx-auto my-4 w-76">
        <Story />
      </div>
    ),
  ],
});

/** A gateway with virtual models on it, which is the box a person reads most of the time. */
export const Serving = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('list')).toBeVisible();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(serving.length);
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
