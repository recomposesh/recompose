import { expect } from 'storybook/test';

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
 * @summary A fresh draft holds nothing, so the save waits for a whole binding and the fields say
 * what each one needs rather than refusing anything a person has not typed yet.
 */
export const AFreshDraft = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Name' })).toHaveFocus();
    await expect(await canvas.findByRole('button', { name: 'Add virtual model' })).toBeDisabled();
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

/** Picking a target reveals its live model list, which is where the binding settles. */
export const APickedTargetOffersItsModels = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'work' }));

    await expect(await canvas.findByRole('button', { name: 'claude-sonnet-5' })).toBeVisible();
  },
});

/** The draft body in the dark scheme, where fields and pickers have to hold their contrast. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
