import type { Account } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { ServedModelRow } from './served-model-row';

const workKey: Account = {
  id: 'k1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'work',
  credentialRef: 'c1',
};

const runtime: Account = {
  id: 'l1',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

const serving = {
  id: 'fast',
  displayName: 'Fast',
  providerModel: 'claude-haiku-4-5',
  target: { standing: 'serving', account: workKey },
} as const;

const meta = preview.meta({
  component: ServedModelRow,
  args: { served: serving },
  decorators: [
    (Story) => (
      <ul className="mx-auto my-4 w-76 field-box">
        <Story />
      </ul>
    ),
  ],
});

/**
 * A definition whose target still stands, which is the row a person reads most of the time.
 *
 * @summary The name a client asks for leads, and the binding reads beneath it in the direction a
 * request travels, so what a request under this name will spend is visible without opening anything.
 */
export const Serving = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Fast')).toBeVisible();
    await expect(await canvas.findByText('fast → work · claude-haiku-4-5')).toBeVisible();
    await expect(canvas.queryByText('serving')).toBeNull();
  },
});

/** A model served by a runtime on this machine, whose mark carries the local kind instead. */
export const ServedLocally = meta.story({
  args: {
    served: {
      id: 'local',
      displayName: 'Local',
      providerModel: 'llama3.2',
      target: { standing: 'serving', account: runtime },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('local → Ollama · llama3.2')).toBeVisible();
  },
});

/**
 * A definition whose target account left the registry, which a person has to repair.
 *
 * @summary The binding stays on screen and drops only the account it can no longer name, because
 * the binding is what a person comes back to repair rather than something to quietly forget.
 */
export const TargetRemoved = meta.story({
  args: { served: { ...serving, target: { standing: 'removed' } } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('target removed')).toBeVisible();
    await expect(await canvas.findByText('fast → claude-haiku-4-5')).toBeVisible();
  },
});

/**
 * A pool that lost one target of two and still answers through the one that stands.
 *
 * @summary The row counts what left rather than declaring the binding removed, because a request
 * under this name still reaches an account. The binding names the account that answers now, so the
 * line and the count describe the same target rather than two.
 */
export const ThinnedPool = meta.story({
  args: {
    served: {
      id: 'spread',
      displayName: 'Spread',
      providerModel: 'claude-opus-5',
      target: { standing: 'thinned', account: workKey, lost: 1 },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('1 target removed')).toBeVisible();
    await expect(await canvas.findByText('spread → work · claude-opus-5')).toBeVisible();
  },
});

/** A pool down to its last target, where the count has to read in the plural. */
export const ThinnedFurther = meta.story({
  args: {
    served: {
      id: 'spread',
      displayName: 'Spread',
      providerModel: 'claude-opus-5',
      target: { standing: 'thinned', account: workKey, lost: 2 },
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('2 targets removed')).toBeVisible();
  },
});

/**
 * A definition routed through a router nobody has filled, which names no target to lose.
 *
 * @summary The row says the composition is unfinished rather than that a target was removed,
 * because nothing left: a person who dropped a router and has not bound a child yet would
 * otherwise be sent to repair a binding that never existed. The line carries the name alone,
 * since an arrow into nothing points at nothing.
 */
export const NoTargetYet = meta.story({
  args: {
    served: { ...serving, providerModel: '', target: { standing: 'incomplete' } },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('no target yet')).toBeVisible();
    await expect(canvas.queryByText('target removed')).toBeNull();
    await expect(await canvas.findByText('fast')).toBeVisible();
  },
});

/** Copying the id says so out loud, because a copy that answers nothing reads as broken. */
export const CopyingTheId = meta.story({
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Copy model id' }));

    await expect(await canvas.findByText('Model id copied.')).toBeInTheDocument();
  },
});

/** The row in the dark scheme, where both standings have to hold against the box. */
export const DarkScheme = meta.story({
  args: { served: { ...serving, target: { standing: 'removed' } } },
  globals: { theme: 'dark' },
});
