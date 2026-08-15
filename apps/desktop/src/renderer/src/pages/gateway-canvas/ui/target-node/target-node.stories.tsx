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

const wired: TargetNodeData = {
  id: 'target:a1',
  kind: 'target',
  account: workKey,
  modelId: 'fast',
  routeNodeId: 't1',
  depth: 0,
};

const removed: TargetNodeData = {
  id: 'ghost:a9',
  kind: 'ghost-target',
  accountId: 'a9',
  modelId: 'slow',
  routeNodeId: 't1',
  depth: 0,
};

const waiting: TargetNodeData = { id: 'pending', kind: 'pending-target' };

const keyed: TargetNodeData = {
  id: 'target:a5',
  kind: 'target',
  modelId: 'fast',
  routeNodeId: 't1',
  depth: 0,
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
  modelId: 'fast',
  routeNodeId: 't1',
  depth: 0,
  account: {
    id: 'a2',
    provider: 'openai',
    kind: 'subscription',
    provenance: 'sign-in',
    label: 'Codex account',
  },
  detail: 'dev@example.com',
};

const aggregated: TargetNodeData = {
  id: 'target:a3',
  kind: 'target',
  modelId: 'fast',
  routeNodeId: 't1',
  depth: 0,
  account: {
    id: 'a3',
    provider: 'openrouter',
    kind: 'aggregator',
    label: 'Shared router',
    credentialRef: 'c-a3',
  },
};

const runtime: TargetNodeData = {
  id: 'target:a4',
  kind: 'target',
  modelId: 'fast',
  routeNodeId: 't1',
  depth: 0,
  account: { id: 'a4', provider: 'ollama', kind: 'local', address: '127.0.0.1:11434' },
};

const keyGlyph = 'M10.2 13.8 19.5 4.5M16.4 7.6l2.2 2.2M13.8 10.2l2.2 2.2';

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

/** The frame carries the account kind tint, so a key and a subscription never share one color. */
export const TheFrameCarriesTheAccountKindTint = meta.story({
  play: async ({ canvas }) => {
    const painted = paintedStyle(await canvas.findByRole('button', { name: /Work key/ }));

    await expect(painted.borderColor).toBe(inScheme('rgb(122, 86, 0)', 'rgb(255, 214, 10)'));
    await expect(painted.borderStyle).toBe('solid');
  },
});

/** A key leads with the key glyph in the key tint, which is what tells it from a runtime. */
export const AKeyChipReadsAsAKey = meta.story({
  args: { data: keyed },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Acme key/ });

    await expect(chipInk(card)).toBe(inScheme('rgb(122, 86, 0)', 'rgb(255, 214, 10)'));
    await expect(chipGlyph(card)).toBe(keyGlyph);
  },
});

/** A subscription leads with its provider mark rather than a generic person. */
export const ASubscriptionChipWearsItsProviderMark = meta.story({
  args: { data: subscribed },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Subscription Codex/ });

    await expect(chipInk(card)).toBe(inScheme('rgb(0, 122, 255)', 'rgb(10, 132, 255)'));
    await expect(card).toHaveTextContent('Subscription');
    await expect(card).toHaveTextContent('Codex');
    await expect(card).toHaveTextContent('dev@example.com');
    await expect(chipGlyph(card)).not.toBe(keyGlyph);
  },
});

/** An aggregator leads with its provider mark in the aggregator tint. */
export const AnAggregatorChipWearsItsProviderMark = meta.story({
  args: { data: aggregated },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Aggregator OpenRouter/ });

    await expect(chipInk(card)).toBe(inScheme('rgb(175, 82, 222)', 'rgb(191, 90, 242)'));
    await expect(chipGlyph(card)).not.toBe(keyGlyph);
    await expect(card).toHaveTextContent('Aggregator');
    await expect(card).toHaveTextContent('OpenRouter');
    await expect(card).toHaveTextContent('Shared router');
  },
});

/** A runtime takes the local tint, and its vendor's own mark stands in the glyph's place. */
export const ARuntimeChipWearsItsVendorMark = meta.story({
  args: { data: runtime },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Ollama/ });

    await expect(chipInk(card)).toBe(inScheme('rgb(191, 62, 47)', 'rgb(255, 128, 104)'));
    await expect(chipGlyph(card)).not.toBe(keyGlyph);
    await expect(card.querySelector('svg title')?.textContent).toBe('Ollama');
    await expect(card).toHaveTextContent('Local Runtime');
    await expect(card).toHaveTextContent('Ollama');
    await expect(card).toHaveTextContent('127.0.0.1:11434');
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

/** The spot a cable was let go at offers the pick without repeating that it waits. */
export const ACardWaitingOnAPickSaysItIsWaiting = meta.story({
  args: { data: waiting },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: /Choose a target/ });

    await expect(card).not.toHaveTextContent('waiting on a pick');
    await expect(paintedStyle(card).borderStyle).toBe('dashed');
  },
});
