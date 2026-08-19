import { expect, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { servingBridgeWorld, servingGateway } from '../../testing/gateway-canvas.testkit';
import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
import { JudgeDirective } from './judge-directive';

const DIRECTIVE = 'A stack trace is code however politely it is asked about.';

function promptRead(element: HTMLElement): string {
  return element instanceof HTMLTextAreaElement ? element.value : '';
}

const meta = preview.meta({
  component: JudgeDirective,
  args: {
    gateway: servingGateway,
    modelId: 'fast',
    routerId: 'r1',
    branches: [
      { label: 'code', rule: 'asks to write or change code' },
      { label: 'chat', rule: 'small talk and questions' },
    ],
    directive: undefined,
  },
  decorators: [framedAsDrawerBox],
  parameters: { bridge: servingBridgeWorld },
});

/** The compiled prompt as it reads before anybody writes a directive. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    const prompt = await canvas.findByRole('textbox', { name: 'Classification prompt' });

    await expect(promptRead(prompt)).toContain('code: asks to write or change code');
    await expect(promptRead(prompt)).toContain('chat: small talk and questions');
  },
});

/** The prompt is prose a person reads rather than rewrites, since its shape is the injection defense. */
export const ThePromptTakesNoEdit = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('textbox', { name: 'Classification prompt' }),
    ).toHaveAttribute('readonly');
  },
});

/** A stored directive reads on its own above the prompt, and again inside it. */
export const ADirectiveAlreadyWritten = meta.story({
  args: { directive: DIRECTIVE },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(DIRECTIVE)).toBeVisible();
    await expect(
      promptRead(await canvas.findByRole('textbox', { name: 'Classification prompt' })),
    ).toContain(DIRECTIVE);
  },
});

/** Editing opens the one field that is a person's own, and the prompt follows every keystroke. */
export const EditingItMovesThePrompt = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit' }));
    await userEvent.type(
      await canvas.findByRole('textbox', { name: 'Judge directive' }),
      'Prefer code.',
    );

    await expect(
      promptRead(await canvas.findByRole('textbox', { name: 'Classification prompt' })),
    ).toContain('Prefer code.');
  },
});

/** Leaving the edit puts the field away and stores nothing. */
export const LeavingTheEdit = meta.story({
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Edit' }));
    await userEvent.click(await canvas.findByRole('button', { name: 'Cancel' }));

    await expect(await canvas.findByRole('button', { name: 'Edit' })).toBeVisible();
  },
});

/** The directive and its prompt in the dark scheme, where inert prose has to stay readable. */
export const DarkScheme = meta.story({
  args: { directive: DIRECTIVE },
  globals: { theme: 'dark' },
});
