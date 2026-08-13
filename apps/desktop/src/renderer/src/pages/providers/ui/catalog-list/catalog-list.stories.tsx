import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { CatalogList } from './catalog-list';

const meta = preview.meta({
  component: CatalogList,
  args: { kind: 'subscription' as const, onPick: () => undefined },
  decorators: [
    (Story) => (
      <div className="w-sheet-wide p-4">
        <Story />
      </div>
    ),
  ],
});

/**
 * The subscription grid: every plan recompose connects.
 *
 * @summary The reading asks for a plan that signs in beside a plan that takes the token it
 * issued, because the two read alike on the grid and differ only in what their connect step asks
 * for. Neither carries a badge, since nothing in the catalog stands inert any more.
 */
export const Subscriptions = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /^Claude/ })).not.toHaveAttribute(
      'aria-disabled',
    );
    await expect(await canvas.findByRole('button', { name: /GitHub Copilot/ })).not.toHaveAttribute(
      'aria-disabled',
    );
    await expect(
      await canvas.findByRole('button', { name: /GLM Coding Plan/ }),
    ).not.toHaveAttribute('aria-disabled');
  },
});

/**
 * The keys grid: the two first-party keys that connect today, then the seven that follow.
 *
 * @summary Each card reads as the endpoint the key is spent against, so the reading asks for the
 * host on a named vendor's card and for the escape hatch that names none, because that card is the
 * one whose address a person supplies themselves.
 */
export const Keys = meta.story({
  args: { kind: 'api-key' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Anthropic API/ })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: /Gemini API/ })).not.toHaveAttribute(
      'aria-disabled',
    );
    await expect(await canvas.findByRole('button', { name: /Custom endpoint/ })).toBeVisible();
  },
});

/**
 * The aggregator grid: seven hosted catalogs, every one of them connectable.
 *
 * @summary Five of the seven sell their own open-model catalogs rather than routing onward, so
 * each card says what it sells rather than repeating the destination's promise.
 */
export const Aggregators = meta.story({
  args: { kind: 'aggregator' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /^OpenRouter/ })).not.toHaveAttribute(
      'aria-disabled',
    );
    await expect(await canvas.findByRole('button', { name: /Cerebras/ })).not.toHaveAttribute(
      'aria-disabled',
    );
  },
});

/**
 * The local grid: four runtimes this machine can serve, beside a server a person addresses.
 *
 * @summary The reading asks for a documented runtime beside the escape hatch, because the two
 * differ only in whether recompose already knows the port, and neither stands inert.
 */
export const LocalRuntimes = meta.story({
  args: { kind: 'local' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /^Ollama/ })).not.toHaveAttribute(
      'aria-disabled',
    );
    await expect(
      await canvas.findByRole('button', { name: /Custom local server/ }),
    ).not.toHaveAttribute('aria-disabled');
  },
});

/** The subscription grid in the dark scheme, where each card lifts off the sheet behind it. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });

/** The local grid in the dark scheme, where a quiet mark has to hold against a dark card. */
export const LocalDarkScheme = meta.story({
  args: { kind: 'local' as const },
  globals: { theme: 'dark' },
});
