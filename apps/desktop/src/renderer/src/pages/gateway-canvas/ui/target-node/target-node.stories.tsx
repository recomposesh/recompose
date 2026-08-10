import type { Account } from '@recompose/contracts';

import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { TargetNodeData } from './target-node';

import { paintedStyle } from '../../../../shared/testing';
import { cardOnCanvas, inScheme } from '../../testing/canvas-flow.testkit';
import { TargetNode } from './target-node';

const workKey: Account = {
  id: 'a1',
  provider: 'openai',
  kind: 'api-key',
  label: 'Work key',
  credentialRef: 'c-a1',
};

const wired: TargetNodeData = { id: 'target:a1', kind: 'target', account: workKey };

const removed: TargetNodeData = { id: 'ghost:a9', kind: 'ghost-target', accountId: 'a9' };

const waiting: TargetNodeData = { id: 'pending', kind: 'pending-target' };

const keyed: TargetNodeData = {
  id: 'target:a5',
  kind: 'target',
  account: {
    id: 'a5',
    provider: 'acme',
    kind: 'api-key',
    label: 'Acme key',
    credentialRef: 'c-a5',
  },
};

const subscribed: TargetNodeData = {
  id: 'target:a2',
  kind: 'target',
  account: { id: 'a2', provider: 'antigravity', kind: 'subscription', label: 'Antigravity' },
};

const aggregated: TargetNodeData = {
  id: 'target:a3',
  kind: 'target',
  account: {
    id: 'a3',
    provider: 'acme-router',
    kind: 'aggregator',
    label: 'Acme router',
    credentialRef: 'c-a3',
  },
};

const runtime: TargetNodeData = {
  id: 'target:a4',
  kind: 'target',
  account: { id: 'a4', provider: 'ollama', kind: 'local', address: '127.0.0.1:11434' },
};

const personGlyph = 'M5.4 19.6c.7-3.5 3.4-5.3 6.6-5.3s5.9 1.8 6.6 5.3';

const keyGlyph = 'M10.2 13.8 19.5 4.5M16.4 7.6l2.2 2.2M13.8 10.2l2.2 2.2';

const networkGlyph = 'M7.2 11l8.5-4.2M7.2 13l8.5 4.2';

function chipInk(card: HTMLElement): string {
  return paintedStyle(card.querySelector('svg')?.parentElement).color;
}

function chipGlyph(card: HTMLElement): string {
  return card.querySelector('svg path')?.getAttribute('d') ?? '';
}

const meta = preview.meta({
  component: TargetNode,
  args: { data: wired, selected: false },
  render: ({ data, selected }) => cardOnCanvas(data.kind, TargetNode, data, selected),
});

/** A stored account standing as the end of a binding, which is where a request finally lands. */
export const Basic = meta.story({});

/** The frame carries the target tint, so the column a card sits in is legible before a word is. */
export const TheFrameCarriesTheTargetTint = meta.story({
  play: async ({ canvas }) => {
    const painted = paintedStyle(await canvas.findByRole('button', { name: /Work key/ }));

    await expect(painted.borderColor).toBe(inScheme('rgb(175, 82, 222)', 'rgb(191, 90, 242)'));
    await expect(painted.borderStyle).toBe('solid');
  },
});

/** A key leads with the key glyph in the key tint, which is what tells it from a runtime. */
export const AKeyChipReadsAsAKey = meta.story({
  args: { data: keyed },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Acme key/ });

    await expect(chipInk(card)).toBe(inScheme('rgb(163, 116, 0)', 'rgb(255, 214, 10)'));
    await expect(chipGlyph(card)).toBe(keyGlyph);
  },
});

/** A subscription leads with the person glyph, in the tint the subscription surfaces already use. */
export const ASubscriptionChipReadsAsAPerson = meta.story({
  args: { data: subscribed },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Antigravity/ });

    await expect(chipInk(card)).toBe(inScheme('rgb(0, 122, 255)', 'rgb(10, 132, 255)'));
    await expect(chipGlyph(card)).toBe(personGlyph);
  },
});

/** An aggregator leads with the network glyph, because it fans one ask out to many vendors. */
export const AnAggregatorChipReadsAsANetwork = meta.story({
  args: { data: aggregated },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Acme router/ });

    await expect(chipInk(card)).toBe(inScheme('rgb(175, 82, 222)', 'rgb(191, 90, 242)'));
    await expect(chipGlyph(card)).toBe(networkGlyph);
  },
});

/** A runtime takes the local tint, and its vendor's own mark stands in the glyph's place. */
export const ARuntimeChipWearsItsVendorMark = meta.story({
  args: { data: runtime },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Ollama/ });

    await expect(chipInk(card)).toBe(inScheme('rgb(23, 134, 155)', 'rgb(64, 200, 224)'));
    await expect(chipGlyph(card)).not.toBe(keyGlyph);
    await expect(card.querySelector('svg title')?.textContent).toBe('Ollama');
  },
});

/** Nothing leaves a target, so the card carries the one port a cable arrives by and no more. */
export const NothingLeavesATarget = meta.story({
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('button', { name: /Work key/ });

    await expect(canvasElement.querySelectorAll('.react-flow__handle')).toHaveLength(1);
    await expect(canvasElement.querySelector('.react-flow__handle.source')).toBeNull();
  },
});

/** An account that left the registry keeps its card and dashes it rather than vanishing. */
export const ARemovedTargetDashesAndSaysSo = meta.story({
  args: { data: removed },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Removed/ });

    await expect(card).toHaveTextContent('not in the registry');
    await expect(paintedStyle(card).borderStyle).toBe('dashed');
    await expect(paintedStyle(card).opacity).toBe('1');
  },
});

/** The spot a cable was let go at holds itself open until a pick lands on it. */
export const ACardWaitingOnAPickSaysItIsWaiting = meta.story({
  args: { data: waiting },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Choose a target/ });

    await expect(card).toHaveTextContent('waiting on a pick');
    await expect(paintedStyle(card).borderStyle).toBe('dashed');
  },
});
