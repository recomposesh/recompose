import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import type { InspectorSubject } from '../gateway-canvas-page/canvas-subjects';

import {
  draftedOnMyGateway,
  servingBridgeWorld,
  servingGateway,
} from '../../testing/gateway-canvas.testkit';
import { GatewayDrawer } from './gateway-drawer';

function subject(standing: InspectorSubject): InspectorSubject {
  return standing;
}

const meta = preview.meta({
  component: GatewayDrawer,
  args: {
    gateway: servingGateway,
    subject: subject({ kind: 'gateway' }),
    refusal: undefined,
    onAskRemoval: () => {},
    onDraftDefined: () => {},
    onModelRenamed: () => {},
  },
  decorators: [
    (Story) => (
      <div className="flex h-150 justify-end bg-surface-content">
        <Story />
      </div>
    ),
  ],
  parameters: { bridge: servingBridgeWorld },
});

/**
 * The gateway subject: the endpoint and what serves, with no add button anywhere.
 *
 * @summary The cable on the canvas is the one add path, so the drawer reads the gateway rather
 * than offering a second way to change it.
 */
export const GatewaySubject = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Endpoint', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('work · claude-haiku-4-5')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Add virtual model' })).toBeNull();
  },
});

/** The virtual model subject: the definition and the binding behind it. */
export const VirtualModelSubject = meta.story({
  args: { subject: subject({ kind: 'virtual-model', modelId: 'fast' }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Virtual model', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('General info', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Model name', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Goes to', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('API Key', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Encrypted key', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('claude-haiku-4-5', { exact: true })).toBeVisible();
  },
});

/** The cable subject: the same binding read from the wire's point of view. */
export const CableSubject = meta.story({
  args: { subject: subject({ kind: 'cable', modelId: 'creative' }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Binding', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Aggregator', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('OpenRouter', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('openai/gpt-5', { exact: true })).toBeVisible();
  },
});

/** The target subject: the stored account a binding lands on. */
export const TargetSubject = meta.story({
  args: { subject: subject({ kind: 'target', accountId: 'k1', modelId: 'fast' }) },
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText('API Key', { exact: true }))[0]).toBeVisible();
    await expect((await canvas.findAllByText('Anthropic', { exact: true }))[0]).toBeVisible();
    await expect(await canvas.findByText('Encrypted key', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Behind of', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Model name', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Model id', { exact: true })).toBeVisible();
    await expect(await canvas.findByText('Fast', { exact: true })).toBeVisible();
  },
});

/** The removed subject: the gap an account left, and what repairs it. */
export const RemovedTargetSubject = meta.story({
  args: { subject: subject({ kind: 'ghost-target', accountId: 'gone', modelId: 'creative' }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Removed', { exact: true })).toBeVisible();
    await expect(await canvas.findByText(/left the registry/)).toBeVisible();
  },
});

/** The draft subject: the fields that finish a definition, editing the held draft live. */
export const DraftSubject = meta.story({
  args: { subject: subject({ kind: 'draft' }) },
  beforeEach: () => draftedOnMyGateway('Steady', 'steady'),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Name' })).toHaveValue('Steady');
    await expect(await canvas.findByRole('button', { name: 'Add virtual model' })).toBeDisabled();
  },
});

/** A refused write standing beside the subject, in the words main refused with. */
export const RefusedWrite = meta.story({
  args: { refusal: 'recompose cannot store this virtual model as it stands.' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'recompose cannot store this virtual model as it stands.',
    );
  },
});

/**
 * The drawer on its way off screen, which is the standing its exit motion plays over.
 *
 * @summary A panel that unmounts the instant a person closes it never plays an exit, so it is held
 * here for exactly as long as that motion runs and reads its subject the whole way out.
 */
export const Leaving = meta.story({
  args: { leaving: true },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Endpoint', { exact: true })).toBeInTheDocument();
  },
});

/** The drawer in the dark scheme, where every subject body has to separate from the stage. */
export const DarkScheme = meta.story({ globals: { theme: 'dark' } });
