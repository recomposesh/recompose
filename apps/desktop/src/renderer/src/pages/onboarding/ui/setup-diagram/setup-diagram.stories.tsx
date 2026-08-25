import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { onASurface } from '../../testing/on-a-surface';
import { SetupDiagram } from './setup-diagram';

const claudePlan = {
  kind: 'subscription' as const,
  model: 'Claude Opus 5',
  under: 'your plan · answering this turn',
};

const twoSources = [
  claudePlan,
  { kind: 'local-runtime' as const, model: 'Llama 3.3', under: 'Ollama · answers the next one' },
];

function firstCable(canvasElement: HTMLElement): DOMRect {
  const drawn = canvasElement.querySelector('svg g path')?.getBoundingClientRect();

  if (!drawn) {
    throw new Error('The diagram drew no cable into the model.');
  }

  return drawn;
}

const meta = preview.meta({
  component: SetupDiagram,
  args: {
    gatewayName: 'My Gateway',
    modelId: 'claude-my-model',
    port: ':8389',
    targets: twoSources,
  },
  decorators: [onASurface],
});

/** The whole graph a person is about to build, with the router dealing between two sources. */
export const TwoSources = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('Round-robin')).toBeVisible();
    await expect(await canvas.findByText('Claude Opus 5')).toBeVisible();
    await expect(await canvas.findByText('Llama 3.3')).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-setup-node]')).toHaveLength(5);
  },
});

/** A single source still gets its router, so a second one drops straight in later. */
export const OneSource = meta.story({
  args: { targets: [claudePlan] },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('Round-robin')).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-setup-node]')).toHaveLength(4);
  },
});

/** Every card is joined by a cable, and every cable carries a pulse. */
export const EveryCardIsWired = meta.story({
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('.cable-pulse')).toHaveLength(4);
  },
});

/** The labels name the two ends a person has to tell apart. */
export const TheEndsAreNamed = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('a request')).toBeVisible();
    await expect(await canvas.findByText('you decide this side')).toBeVisible();
  },
});

/** Every cable meets a card's port rather than bowing off the field. */
export const EveryCableMeetsACard = meta.story({
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector('svg');

    if (!field) {
      throw new Error('The diagram drew no cables.');
    }

    const bounds = field.getBoundingClientRect();
    const escaped = [...field.querySelectorAll('path')].filter((cable) => {
      const run = cable.getBoundingClientRect();

      return run.top < bounds.top - 1 || run.bottom > bounds.bottom + 1;
    });

    await expect(escaped).toHaveLength(0);
  },
});

/** The straight run between the gateway and the model stays level. */
export const TheStraightRunStaysLevel = meta.story({
  play: async ({ canvasElement }) => {
    await expect(firstCable(canvasElement).height).toBeLessThan(6);
  },
});
