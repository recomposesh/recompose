import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { heldDraft } from '../../lib/use-held-draft';
import {
  draftedOnMyGateway,
  servingBridgeWorld,
  servingGateway,
} from '../../testing/gateway-canvas.testkit';
import { DraftInspector } from './draft-inspector';

const meta = preview.meta({
  component: DraftInspector,
  args: { gateway: servingGateway, onDefined: () => {} },
  beforeEach: () => draftedOnMyGateway(),
  decorators: [
    (Story) => (
      <div className="flex h-150 w-80 flex-col border-s border-line-subtle bg-surface-toolbar">
        <Story />
      </div>
    ),
  ],
  parameters: { bridge: servingBridgeWorld },
});

/**
 * The fields a draft settles through, opening on the name with the save still down.
 *
 * @summary A fresh draft holds nothing, so the save waits for every blank to be filled and the
 * fields say what each one needs rather than refusing anything a person has not typed yet.
 */
export const AFreshDraft = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Name' })).toHaveFocus();
    await expect(await canvas.findByText('Bind this model to')).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Add virtual model' })).toBeDisabled();
  },
});

/** A whole binding with no name is still a blank, so the save stays down until the name lands. */
export const TheSaveWaitsForTheName = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^Provider One provider/ }));
    await userEvent.click(await canvas.findByRole('button', { name: /work/ }));
    await userEvent.click(await canvas.findByRole('button', { name: 'claude-sonnet-5' }));

    await expect(await canvas.findByRole('button', { name: 'Add virtual model' })).toBeDisabled();

    await userEvent.type(await canvas.findByRole('textbox', { name: 'Name' }), 'Fast');

    await expect(await canvas.findByRole('button', { name: 'Add virtual model' })).toBeEnabled();
  },
});

type RoutingCanvas = {
  findByRole: (role: string, options: { name: RegExp | string }) => Promise<HTMLElement>;
};

/** Names a draft and answers the binding ask with a router, where every router reading starts. */
async function namedThenRouted(canvas: RoutingCanvas): Promise<void> {
  await userEvent.type(await canvas.findByRole('textbox', { name: 'Name' }), 'Spread');
  await userEvent.click(await canvas.findByRole('button', { name: /^Router Picks among/ }));
}

/**
 * Answering with a router asks which kind before the save opens, and no mode arrives chosen.
 *
 * @summary The mode decides what the draft still owes, so it is asked rather than defaulted: a
 * save open on this step would store a router nobody picked the spreading of.
 */
export const ARouterIsAskedHowItSpreads = meta.story({
  play: async ({ canvas }) => {
    await namedThenRouted(canvas);

    await expect(await canvas.findByRole('radiogroup', { name: 'Routing mode' })).toBeVisible();
    await expect(await canvas.findByRole('radio', { name: 'Failover' })).not.toBeChecked();
    await expect(await canvas.findByRole('button', { name: 'Add virtual model' })).toBeDisabled();
  },
});

/**
 * A router answers the routing on its own, so a named draft can save with no provider picked.
 *
 * @summary The router is born holding no child and fills by cable afterwards, which is what the
 * step says under the fields rather than leaving a person to wonder what the save will leave.
 */
export const ARouterNeedsNoProvider = meta.story({
  play: async ({ canvas, userEvent: pressed }) => {
    await namedThenRouted(canvas);
    await pressed.click(await canvas.findByRole('radio', { name: 'Failover' }));

    await expect(await canvas.findByPlaceholderText('Failover')).toHaveValue('');
    await expect(await canvas.findByRole('button', { name: 'Add virtual model' })).toBeEnabled();
  },
});

/** Typing the name derives the id a client sends, and both land in the held draft at once. */
export const TheIdFollowsTheName = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Name' }), 'Fast Sonnet');

    await expect(await canvas.findByRole('textbox', { name: 'Model id' })).toHaveValue(
      'fast-sonnet',
    );
    await expect(heldDraft('my-gateway')?.definition.id).toBe('fast-sonnet');
  },
});

/** Answering the ask with a provider reveals its live model list, where the binding settles. */
export const APickedTargetOffersItsModels = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^Provider One provider/ }));
    await userEvent.click(await canvas.findByRole('button', { name: /work/ }));

    await expect(await canvas.findByRole('button', { name: 'claude-sonnet-5' })).toBeVisible();
  },
});

/** The draft body in the dark scheme, where fields and pickers have to hold their contrast. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
