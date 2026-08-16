import type { SubscriptionTool } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { catalogEntries } from '../../model/provider-catalog';
import { ProviderConnectWay } from './provider-connect-way';

const claudeCode: SubscriptionTool = {
  provider: 'anthropic',
  toolName: 'Claude Code',
  present: true,
  signInCommand: 'claude /login',
  shellSetupLine: 'export CLAUDE_CONFIG_DIR="/opt/recompose/anthropic/active"',
};

const anthropic = catalogEntries[0];

if (anthropic === undefined) {
  throw new Error('the catalog offers no first entry');
}

const ollama = catalogEntries.find((entry) => entry.id === 'ollama');

if (ollama === undefined) {
  throw new Error('the catalog offers no ollama entry');
}

function entryNamed(id: string) {
  const found = catalogEntries.find((entry) => entry.id === id);

  if (found === undefined) {
    throw new Error(`the catalog offers no ${id} entry`);
  }

  return found;
}

const meta = preview.meta({
  component: ProviderConnectWay,
  args: { entry: anthropic, way: 'subscription' as const, onConnected: () => undefined },
  parameters: { bridge: { tools: [claudeCode] } },
  decorators: [
    (Story) => (
      <div className="w-sheet p-4">
        <Story />
      </div>
    ),
  ],
});

/**
 * A subscription pick, standing only the sign-in way.
 *
 * @summary The reading refuses the key field, because the way was settled by the screen that
 * opened the catalog and a form for the other way would reopen a choice already made.
 */
export const Subscription = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Sign in to Anthropic' })).toBeVisible();
    await expect(canvas.queryByLabelText('Key', { exact: true })).toBeNull();
  },
});

/**
 * A key pick, asking only for the key that way still needs.
 *
 * @summary The provider and the label both ride in from the picked entry, so the key is the one
 * thing a person still has to supply.
 */
export const Key = meta.story({
  args: { way: 'api-key' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Key', { exact: true })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /Sign in/ })).toBeNull();
  },
});

/**
 * A local pick, standing the detect step that looks without asking.
 *
 * @summary The reading refuses both credential ways, because a local runtime holds no secret:
 * the step reports whether the runtime answers and leaves the decision with the person.
 */
export const Local = meta.story({
  args: { entry: ollama, way: 'local' as const },
  parameters: { bridge: { reachability: { verdict: 'answers' as const, version: '0.5.1' } } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Ollama is running at 127.0.0.1:11434.')).toBeVisible();
    await expect(canvas.queryByLabelText('Key', { exact: true })).toBeNull();
    await expect(canvas.queryByRole('button', { name: /Sign in/ })).toBeNull();
  },
});

/** The sign-in way in the dark scheme, where the card lifts off the sheet behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });

/**
 * A plan that authorizes by device code, which recompose runs rather than a tool.
 *
 * @summary Which surface a pick reaches follows how the plan authorizes, never which plan it is.
 * The reading pins that a plan on the device-code channel meets the code step and never the
 * command a tool-run sign-in would name.
 */
export const SignsInByDeviceCode = meta.story({
  args: { entry: entryNamed('kimi') },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Enter this code to finish signing in')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /Sign in to/ })).toBeNull();
  },
});

/** A plan that redirects a browser, which meets the one press rather than a code. */
export const SignsInThroughTheBrowser = meta.story({
  args: { entry: entryNamed('antigravity') },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Open the sign-in page' }),
    ).toBeVisible();
    await expect(canvas.queryByText('Enter this code to finish signing in')).toBeNull();
  },
});
