import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { clientNamed } from '../../../../entities/harness';
import { onAStepSurface } from '../../testing/on-a-surface';
import { PointingStep } from './pointing-step';

const facts = {
  gatewayName: 'My Gateway',
  slug: 'my-gateway',
  baseUrl: 'http://127.0.0.1:8389',
  apiKey: 'rc-1f6e2',
  models: [{ id: 'claude-my-model', displayName: 'My model' }],
};

const meta = preview.meta({
  component: PointingStep,
  args: {
    clients: [clientNamed('claude-code'), clientNamed('cursor')],
    facts,
    onBack: fn(),
    onConnected: fn(),
    onOpen: fn(),
    onSkip: fn(),
    openId: 'claude-code',
  },
  decorators: [onAStepSurface],
});

/** One entry per picked harness, the first open and the rest closed. */
export const TwoHarnesses = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Claude Code/u })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(await canvas.findByRole('button', { name: /Cursor/u })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
});

/** The lines carry the gateway setup just built, not a fixed example. */
export const TheLinesCarryTheBuiltGateway = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText(/127\.0\.0\.1:8389/u).length).toBeGreaterThan(0);
    await expect(canvas.getAllByText(/claude-my-model/u).length).toBeGreaterThan(0);
  },
});

/** Nothing marks an entry as done, because setup cannot see inside a terminal. */
export const NothingClaimsToBeDone = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('checkbox')).toBeNull();
  },
});

/** Opening another entry reports which one, so only one body ever stands open. */
export const OpeningAnother = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Cursor/u }));

    await expect(args.onOpen).toHaveBeenCalledWith('cursor');
  },
});

/** Moving on rests on the person saying they ran the line. */
export const SayingTheyConnectedOne = meta.story({
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'I connected one' }));

    await expect(args.onConnected).toHaveBeenCalledOnce();
  },
});
