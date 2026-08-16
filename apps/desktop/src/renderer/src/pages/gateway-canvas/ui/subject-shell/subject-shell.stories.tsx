import { useState } from 'react';
import { expect, fn } from 'storybook/test';

import preview from '#.storybook/preview';

import {
  editFooter,
  editRow,
  editableSectionHeading,
  factRow,
  glyph,
  savedNotice,
  sectionHeading,
  subjectShell,
} from './subject-shell';

const asked = fn<() => void>();

function ShellUnderProof() {
  return (
    <aside className="flex h-120 w-80 flex-col overflow-hidden border-s border-line-subtle bg-surface-toolbar">
      {subjectShell(
        {
          lead: glyph('network'),
          leadClasses: 'bg-gateway text-highlight-ink',
          kicker: 'Gateway',
          name: 'My Gateway',
        },
        <>
          {sectionHeading('General info')}
          <div className="field-box">
            {factRow('Name', 'My Gateway')}
            {factRow('Port', '8397')}
          </div>
          {savedNotice(true)}
        </>,
        { label: 'Delete gateway', onPress: asked },
      )}
    </aside>
  );
}

function RestingBoxUnderProof() {
  return (
    <div className="w-76 bg-surface-toolbar p-3">
      {editableSectionHeading('General info', false, asked)}
      <div className="field-box">{factRow('Name', 'My Gateway')}</div>
    </div>
  );
}

function EditingBoxUnderProof() {
  const [name, setName] = useState('My Gateway');

  return (
    <div className="w-76 bg-surface-toolbar p-3">
      {editableSectionHeading('General info', true, asked)}
      <div className="field-box">
        {editRow(
          'Name',
          <input
            aria-label="Gateway name"
            className="field-control w-full"
            onInput={(event) => {
              setName(event.currentTarget.value);
            }}
            type="text"
            value={name}
          />,
        )}
      </div>
      {editFooter({ onCancel: asked, onSave: asked }, 'A gateway needs a name to stand under.')}
    </div>
  );
}

const meta = preview.meta({
  component: ShellUnderProof,
  decorators: [
    (Story) => (
      <div className="flex justify-end bg-surface-content">
        <Story />
      </div>
    ),
  ],
});

/**
 * The layout every inspector subject wears: head, scrolling body, deletion footer.
 *
 * @summary The shell decides where a subject's parts stand, so every body builder composes these
 * primitives rather than repeating the frame.
 */
export const TheShellCarriesItsSubject = meta.story({
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'My Gateway' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: 'Delete gateway' })).toBeVisible();
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      /Restart the app that points at this gateway/,
    );
  },
});

const HIT_TARGET = 24;

function pointerTargetAt(control: Element, awayX: number, awayY: number): Element | null {
  const box = control.getBoundingClientRect();

  return document.elementFromPoint(box.x + box.width / 2 + awayX, box.y + box.height / 2 + awayY);
}

/**
 * A box at rest, wearing the Edit affordance that opens it.
 *
 * @summary The affordance prints as small as the caption beside it, so the proof a pointer can
 * land on it reads from the page rather than from the ink: a press anywhere inside the 24 pixel
 * square the canvas accessibility contract names has to reach the button.
 */
export const ARestingBoxOffersItsEdit = meta.story({
  render: () => <RestingBoxUnderProof />,
  play: async ({ canvas }) => {
    const edit = await canvas.findByRole('button', { name: 'Edit' });
    const reach = HIT_TARGET / 2 - 1;

    await expect(edit).toBeVisible();
    await expect(pointerTargetAt(edit, 0, -reach)).toBe(edit);
    await expect(pointerTargetAt(edit, 0, reach)).toBe(edit);
    await expect(pointerTargetAt(edit, -reach, 0)).toBe(edit);
    await expect(pointerTargetAt(edit, reach, 0)).toBe(edit);
  },
});

/** A box mid-edit, wearing the footer pair and the refusal the last save left. */
export const AnEditingBoxWithItsFooter = meta.story({
  render: () => <EditingBoxUnderProof />,
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('textbox', { name: 'Gateway name' })).toHaveValue(
      'My Gateway',
    );
    await expect(await canvas.findByRole('button', { name: 'Save' })).toBeVisible();
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      'A gateway needs a name to stand under.',
    );
  },
});
