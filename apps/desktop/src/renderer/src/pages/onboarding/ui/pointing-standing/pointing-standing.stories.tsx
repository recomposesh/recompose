import { defaultSettings } from '@recompose/contracts';
import { expect, fn, screen, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import { gatewaySeed, paintedBox } from '../../../../shared/testing';
import { onAStepSurface } from '../../testing/on-a-surface';
import { PointingStanding } from './pointing-standing';

const fresh = { ...defaultSettings(), setupWizardSettled: false };

const built = gatewaySeed({
  slug: 'my-gateway',
  displayName: 'My Gateway',
  port: 8389,
  virtualModels: [
    {
      id: 'claude-my-model',
      displayName: 'My model',
      routing: {
        entry: 'seat:1',
        nodes: { 'seat:1': { kind: 'target', accountId: 'a1', providerModel: 'claude-opus-5' } },
      },
    },
  ],
});

const meta = preview.meta({
  component: PointingStanding,
  args: {
    gateway: built,
    harnesses: new Set(['claude-code', 'codex-cli']),
    onBack: fn(),
    onConnected: fn(),
    onSkip: fn(),
  },
  parameters: { bridge: { gateways: [built], settings: fresh } },
  decorators: [onAStepSurface],
});

/** Every harness a person picked gets its own entry, in the order the catalog holds them. */
export const EveryPickedHarness = meta.story({
  play: async () => {
    await expect(await screen.findByRole('button', { name: /Claude Code/u })).toBeVisible();
    await expect(await screen.findByRole('button', { name: /Codex CLI/u })).toBeVisible();
  },
});

/** The first entry stands open, so a person meets lines rather than a row of closed names. */
export const TheFirstEntryStandsOpen = meta.story({
  play: async () => {
    await expect(await screen.findByRole('button', { name: /Claude Code/u })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
});

/** Opening one closes whichever stood open, so only one block of lines is ever on screen. */
export const OpeningOneClosesTheOther = meta.story({
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: /Codex CLI/u }));

    await expect(await screen.findByRole('button', { name: /Codex CLI/u })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(await screen.findByRole('button', { name: /Claude Code/u })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
});

/** The lines carry the gateway setup built, port and all. */
export const TheLinesCarryTheBuiltGateway = meta.story({
  play: async () => {
    await expect((await screen.findAllByText(/127\.0\.0\.1:8389/u)).length).toBeGreaterThan(0);
  },
});

/** A long block never pushes the harnesses under it off screen; it scrolls inside its own room. */
export const ALongBlockKeepsTheNamesInView = meta.story({
  play: async ({ canvasElement }) => {
    const codex = await screen.findByRole('button', { name: /Codex CLI/u });

    await expect(paintedBox(codex).bottom).toBeLessThanOrEqual(paintedBox(canvasElement).bottom);
    await expect(codex).toBeVisible();
  },
});
