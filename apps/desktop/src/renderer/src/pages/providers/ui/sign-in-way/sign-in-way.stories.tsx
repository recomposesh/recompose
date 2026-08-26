import type { SubscriptionTool } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { SignInWay } from './sign-in-way';

const claudeCode: SubscriptionTool = {
  provider: 'anthropic',
  toolName: 'Claude Code',
  present: true,
  signInCommand: 'claude login',
  shellSetupLine: 'export CLAUDE_CONFIG_DIR="/Users/dev/.recompose/anthropic"',
};

const meta = preview.meta({
  component: SignInWay,
  args: { name: 'Anthropic', provider: 'anthropic' as const, onConnected: () => undefined },
  decorators: [
    (Story) => (
      <div className="w-sheet p-4">
        <Story />
      </div>
    ),
  ],
});

/**
 * The subscription arm when the provider's tool is installed and ready to sign in.
 *
 * @summary The reading asks for the yield in the heading and for the live act, because the arm
 * has to say what connecting gives before it offers to connect.
 */
export const ToolPresent = meta.story({
  parameters: { bridge: { tools: [claudeCode] } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('heading', { name: 'An account for Claude Code' }),
    ).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Sign in to Anthropic' })).toBeEnabled();
  },
});

/**
 * The same arm when the tool is missing, which names the gap instead of failing later.
 *
 * @summary The act stays on screen but cannot move, so a person reads what to install and where
 * the sign-in will stand once they have.
 */
export const ToolAbsent = meta.story({
  parameters: {
    bridge: {
      tools: [{ provider: 'anthropic' as const, toolName: 'Claude Code', present: false as const }],
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/isn't installed/)).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Sign in to Anthropic' }),
    ).toBeDisabled();
  },
});

const codexAbsent: SubscriptionTool = {
  provider: 'openai',
  toolName: 'Codex',
  present: false,
  signInCommand: 'codex login',
  shellSetupLine: 'export CODEX_HOME="/Users/dev/.recompose/openai"',
};

const codexPresent: SubscriptionTool = { ...codexAbsent, present: true };

type Finds = { findByRole: (role: string, options: { name: string }) => Promise<HTMLElement> };

/**
 * That the way recompose holds itself is offered and pressable.
 *
 * @summary Both readings below ask this first and then part company over the tool's own way, so
 * the shared half is named once. What tells the two stories apart is what they say about the tool,
 * never whether recompose's own way stood.
 */
async function theAppsOwnWayStands(canvas: Finds): Promise<void> {
  await expect(
    await canvas.findByRole('button', { name: 'Sign in to OpenAI through recompose' }),
  ).toBeEnabled();
}

/**
 * A plan reachable both ways, on a machine carrying no Codex at all.
 *
 * @summary This is the arm that used to read as broken: the tool's act stood inert and nothing
 * else on the step could be pressed, so a person with a ChatGPT plan and no Codex install had no
 * way in. The reading pins that recompose's own sign-in is offered and live here, and that the
 * tool's act still says what it waits on rather than disappearing.
 */
export const BothWaysWithTheToolAbsent = meta.story({
  args: { name: 'OpenAI', provider: 'openai' as const },
  parameters: { bridge: { tools: [codexAbsent] } },
  play: async ({ canvas }) => {
    await theAppsOwnWayStands(canvas);
    await expect(await canvas.findByText(/isn't installed/)).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Sign in to OpenAI' })).toBeDisabled();
  },
});

/**
 * The same plan on a machine that does carry Codex, where both ways stand live.
 *
 * @summary Neither way outranks the other, so the reading asks for both to be pressable at once.
 * A person picks by what each says rather than by which one the step left enabled.
 */
export const BothWaysWithTheToolPresent = meta.story({
  args: { name: 'OpenAI', provider: 'openai' as const },
  parameters: { bridge: { tools: [codexPresent] } },
  play: async ({ canvas }) => {
    await theAppsOwnWayStands(canvas);
    await expect(await canvas.findByRole('button', { name: 'Sign in to OpenAI' })).toBeEnabled();
  },
});

/**
 * A plan only its own tool signs into keeps one way in and says so.
 *
 * @summary Anthropic forbids a third party to offer a claude.ai login, so this arm must never
 * grow the row the Codex arms carry. The reading pins its absence rather than assuming it.
 */
export const OneWayInStaysOneWay = meta.story({
  parameters: { bridge: { tools: [claudeCode] } },
  play: async ({ canvas }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Sign in to Anthropic through recompose' }),
    ).toBeNull();
  },
});

/** The same arm in the dark scheme, where the card lifts off the drawer behind it. */
export const DarkScheme = meta.story({
  parameters: { bridge: { tools: [claudeCode] } },
  globals: { theme: 'dark' },
});

/** The two-way arm in the dark scheme, where both rows have to stay legible against the sheet. */
export const BothWaysDarkScheme = meta.story({
  args: { name: 'OpenAI', provider: 'openai' as const },
  parameters: { bridge: { tools: [codexAbsent] } },
  globals: { theme: 'dark' },
});
