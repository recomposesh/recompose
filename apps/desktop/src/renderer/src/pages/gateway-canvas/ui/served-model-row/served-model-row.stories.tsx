import type { Account } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { framedAsDrawerBox } from '../../testing/subject-shell.testkit';
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
      <ul className="field-box">
        <Story />
      </ul>
    ),
    framedAsDrawerBox,
  ],
});

/** The lines a row gave up on, which is what it lets go of when it runs out of room. */
function clippedLines(canvasElement: HTMLElement): readonly string[] {
  return [...canvasElement.querySelectorAll<HTMLElement>('li span.truncate')]
    .filter((line) => line.scrollWidth > line.clientWidth)
    .map((line) => line.innerText);
}

/**
 * A definition whose target still stands, which is the row a person reads most of the time.
 *
 * @summary The name a person gave it leads with the id a client sends beside it, and what serves
 * reads beneath the pair, so the account and the real model a request under this name will spend
 * are visible without opening anything.
 */
export const Serving = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('Fast')).toBeVisible();
    await expect(await canvas.findByText('fast')).toBeVisible();
    await expect(await canvas.findByText('work · claude-haiku-4-5')).toBeVisible();
    await expect(canvas.queryByText('serving')).toBeNull();
    await expect(clippedLines(canvasElement)).toEqual([]);
  },
});

/**
 * A binding long enough to test the panel, which still reads whole rather than trailing off.
 *
 * @summary The binding is the fact a person opened this box for, so it keeps the row's width and
 * the client-facing id beside the name gives its own up first: a row that hides which account and
 * which real model answer under a name is a row that cannot be acted on.
 */
export const ALongBindingStillReadsWhole = meta.story({
  args: {
    served: {
      id: 'creative',
      displayName: 'Creative',
      providerModel: 'openai/gpt-5',
      target: {
        standing: 'serving',
        account: {
          id: 'g1',
          provider: 'openrouter',
          kind: 'aggregator',
          label: 'openrouter',
          credentialRef: 'c2',
        },
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('openrouter · openai/gpt-5')).toBeVisible();
    await expect(clippedLines(canvasElement)).toEqual([]);
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
    await expect(await canvas.findByText('Ollama · llama3.2')).toBeVisible();
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
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('provider removed')).toBeVisible();
    await expect(await canvas.findByText('claude-haiku-4-5')).toBeVisible();
    await expect(clippedLines(canvasElement)).toEqual([]);
  },
});

/**
 * A pool that lost one target of two and still answers through the one that stands.
 *
 * @summary The row counts what left rather than declaring the binding removed, because a request
 * under this name still reaches an account. The binding names the account that answers now, so the
 * line and the count describe the same target rather than two. The longer count leaves the top
 * line too narrow for everything, and what gives way is the client-facing id: the name and the
 * binding both read whole, which is the pair a person acts on.
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
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('1 provider removed')).toBeVisible();
    await expect(await canvas.findByText('work · claude-opus-5')).toBeVisible();
    await expect(clippedLines(canvasElement)).toEqual(['spread']);
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
    await expect(await canvas.findByText('2 providers removed')).toBeVisible();
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
    await expect(await canvas.findByText('no provider yet')).toBeVisible();
    await expect(canvas.queryByText('provider removed')).toBeNull();
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
