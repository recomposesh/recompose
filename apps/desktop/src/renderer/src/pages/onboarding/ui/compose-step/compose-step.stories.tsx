import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { ComposeStep } from './compose-step';

const claudePlan = {
  kind: 'subscription' as const,
  model: 'Claude Opus 5',
  under: 'your plan · answering this turn',
};

const twoSources = [
  claudePlan,
  { kind: 'local-runtime' as const, model: 'Llama 3.3', under: 'Ollama · answers the next one' },
];

const meta = preview.meta({
  component: ComposeStep,
  args: {
    gatewayName: 'My Gateway',
    modelId: 'claude-my-model',
    onBack: fn(),
    onCreate: fn(),
    onSkip: fn(),
    port: ':8389',
    targets: twoSources,
  },
  decorators: [
    (Story) => (
      <div className="h-200 w-full bg-surface-content">
        <Story />
      </div>
    ),
  ],
});

/** The graph a person is asked to build, and the two acts that settle the step. */
export const TwoSources = meta.story({
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('img', { name: 'Now, your first virtual model' }),
    ).toBeVisible();
    await expect(
      await canvas.findByText(/deals each request across your 2 sources/u),
    ).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Create' })).toBeEnabled();
  },
});

/** With one source the lede says what the router is for rather than counting to one. */
export const OneSource = meta.story({
  args: { targets: [claudePlan] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/a second source drops straight in/u)).toBeVisible();
  },
});

/** The lede names the id a harness will ask for, because that is what a person copies later. */
export const TheLedeNamesTheId = meta.story({
  args: { modelId: 'my-model' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Your harnesses ask for my-model/u)).toBeVisible();
  },
});

/** Create hands the graph over to be built. */
export const Creating = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Create' }));

    await expect(args.onCreate).toHaveBeenCalledOnce();
  },
});
