import { useRef } from 'react';
import { expect, fn, userEvent } from 'storybook/test';

import preview from '#.storybook/preview';

import type { ModelFieldsProps } from './model-fields';

import { inTheDrawersColumn, pickerArgs } from '../../testing/routing-picker-args';
import { ModelFields } from './model-fields';

/**
 * @summary The ref is made inside the render rather than carried in the args, because a ref in the
 * args is one object shared by every story and React fills it with a live element: anything that
 * later walks the args, as the docs inference does, then walks the whole document from it.
 */
function FieldsWithAFreshRef(props: Omit<ModelFieldsProps, 'nameField'>) {
  const nameField = useRef<HTMLInputElement>(null);

  return <ModelFields {...props} nameField={nameField} />;
}

const meta = preview.meta({
  component: FieldsWithAFreshRef,
  args: {
    name: '',
    onNameChange: () => {},
    id: '',
    onIdChange: () => {},
    ...pickerArgs,
  },
  decorators: [inTheDrawersColumn],
});

/**
 * The fields as the flow opens: nothing settled, and the binding ask standing unanswered.
 *
 * @summary The second box opens on the same question a released cable opens, so a person who means
 * to build a router first never has to walk through a provider they did not want.
 */
export const Empty = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Name' })).toHaveValue('');
    await expect(await canvas.findByText('Bind this model to', { exact: true })).toBeVisible();
  },
});

/** The providers on offer, once the ask was answered with one rather than with a router. */
export const PickingAProvider = meta.story({
  args: { bindsThrough: 'target' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Pick a provider', { exact: true })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: /work/ })).toBeVisible();
  },
});

/**
 * A draft answered with a router, which keeps its name and id while the picker rests on the router.
 *
 * @summary The picker's own reading covers what that step says. What only this one can show is
 * that answering the ask never takes the fields away, so a person naming a model and then routing
 * it through a router does not lose the name they typed.
 */
export const RoutingThroughARouter = meta.story({
  args: { bindsThrough: 'router', routerMode: 'failover', name: 'Fast', id: 'fast' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Routes through a router')).toBeVisible();
    await expect(await canvas.findByRole('textbox', { name: 'Name' })).toHaveValue('Fast');
    await expect(await canvas.findByRole('textbox', { name: 'Model id' })).toHaveValue('fast');
  },
});

/**
 * A settled draft, reading the id a client will send in its own editable field under the name.
 *
 * @summary The id is derived from the name and then a person's to edit, so it stands in a field a
 * person can check against what they will paste into a client, and the hint says why one caller's
 * picker may skip it.
 */
export const Settled = meta.story({
  args: {
    name: 'Fast Sonnet',
    id: 'fast-sonnet',
    target: 'k1',
    targetName: 'work',
    models: ['claude-haiku-4-5', 'claude-sonnet-5'],
    providerModel: 'claude-sonnet-5',
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Model id' })).toHaveValue(
      'fast-sonnet',
    );
    await expect(await canvas.findByText('Models work serves', { exact: true })).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: 'Select a different provider' }),
    ).toBeVisible();
  },
});

/**
 * The offer standing under a skipped id, which reshapes it in one press.
 *
 * @summary The offer names the id it would leave behind rather than describing the rule again, so
 * a person reads what they are about to serve under before they take it.
 */
export const OfferingTheShapedId = meta.story({
  args: {
    name: 'Fast Sonnet',
    id: 'fast-sonnet',
    onIdChange: fn(),
    target: 'k1',
    targetName: 'work',
    models: ['claude-sonnet-5'],
  },
  play: async ({ args, canvas }) => {
    await expect(await canvas.findByText(/Claude Code lists only ids/)).toBeVisible();

    await userEvent.click(await canvas.findByRole('button', { name: 'Use claude-fast-sonnet' }));

    await expect(args.onIdChange).toHaveBeenCalledWith('claude-fast-sonnet');
  },
});

/** An id carrying the word anywhere, which every caller's picker surfaces, so no hint stands. */
export const NoHintNeeded = meta.story({
  args: {
    name: 'Fast Claude',
    id: 'fast-claude',
    target: 'k1',
    targetName: 'work',
    models: ['claude-sonnet-5'],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Model id' })).toHaveValue(
      'fast-claude',
    );
    await expect(canvas.queryByText(/Claude Code/)).toBeNull();
  },
});

/** A refused name, which says so under the field it refuses rather than under the whole flow. */
export const NameRefused = meta.story({
  args: { name: 'fast', nameRefusal: 'This gateway already serves a virtual model named "fast".' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'already serves a virtual model',
    );
  },
});

/**
 * A target whose model list nothing could read, refusing where the models would have stood.
 *
 * @summary The refusal takes the place of the list rather than sitting under the flow, because the
 * one thing a person can act on is the account they just picked.
 */
export const ModelListRefused = meta.story({
  args: {
    name: 'Fast',
    target: 'l1',
    targetName: 'Ollama',
    modelRefusal: "recompose couldn't read this account's model list.",
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('alert')).toHaveTextContent("couldn't read");
  },
});

/** A conditional draft walks past the mode, because it is born naming what reads its requests. */
export const ConditionalWalksOnForItsJudge = meta.story({
  args: { name: 'Fast', bindsThrough: 'router' as const, routerMode: 'conditional' as const },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Pick the judge')).toBeVisible();
  },
});

/** The fields in the dark scheme, where the refusal tint has to hold against the box. */
export const DarkScheme = meta.story({
  args: {
    name: 'Fast',
    target: 'l1',
    targetName: 'Ollama',
    modelRefusal: "recompose couldn't read this account's model list.",
  },
  globals: { theme: 'dark' },
});
