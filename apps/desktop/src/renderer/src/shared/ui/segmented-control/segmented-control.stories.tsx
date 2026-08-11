import { useState } from 'react';
import { expect, waitFor } from 'storybook/test';

import preview from '#.storybook/preview';

import { SegmentedControl } from '../index';

type Theme = 'system' | 'light' | 'dark';

const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: Theme; label: string }[];

const meta = preview.meta({
  component: SegmentedControl,
  args: {
    label: 'Appearance',
    value: 'system',
    options: themeOptions,
    onChangeValue: () => {},
  },
});

function ControlledThemeChoice({ inert = false }: { inert?: boolean }) {
  const [theme, setTheme] = useState<Theme>('system');

  return (
    <>
      <SegmentedControl
        label="Appearance"
        value={theme}
        options={themeOptions}
        onChangeValue={setTheme}
        inert={inert}
      />
      <p>stored: {theme}</p>
    </>
  );
}

/** One of three mutually exclusive choices, resting on the app default. */
export const Basic = meta.story({
  render: () => <ControlledThemeChoice />,
  play: async ({ canvas, userEvent }) => {
    const group = await canvas.findByRole('radiogroup', { name: 'Appearance' });
    const system = await canvas.findByRole('radio', { name: 'System' });
    const light = await canvas.findByRole('radio', { name: 'Light' });

    await expect(group).toBeInTheDocument();
    await expect(system).toHaveAttribute('aria-checked', 'true');
    await expect(light).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(light);

    await expect(light).toHaveAttribute('aria-checked', 'true');
    await expect(await canvas.findByText('stored: light')).toBeInTheDocument();
  },
});

/** The keyboard contract: one tab stop, and an arrow key that moves and selects at once. */
export const ArrowKeysSelect = meta.story({
  render: () => <ControlledThemeChoice />,
  play: async ({ canvas, userEvent }) => {
    const system = await canvas.findByRole('radio', { name: 'System' });
    const light = await canvas.findByRole('radio', { name: 'Light' });

    await expect(system).toHaveAttribute('tabindex', '0');
    await expect(light).toHaveAttribute('tabindex', '-1');

    system.focus();
    await userEvent.keyboard('{ArrowRight}');

    await waitFor(async () => {
      await expect(light).toHaveFocus();
    });
    await expect(light).toHaveAttribute('aria-checked', 'true');
    await expect(await canvas.findByText('stored: light')).toBeInTheDocument();
  },
});

/** A choice whose machinery the app lacks: reachable and explained, never movable. */
export const Inert = meta.story({
  render: () => <ControlledThemeChoice inert />,
  play: async ({ canvas, userEvent }) => {
    const group = await canvas.findByRole('radiogroup', { name: 'Appearance' });
    const light = await canvas.findByRole('radio', { name: 'Light' });

    await expect(group).toHaveAttribute('aria-disabled', 'true');
    await expect(light).not.toHaveAttribute('disabled');

    await userEvent.click(light);

    await expect(await canvas.findByText('stored: system')).toBeInTheDocument();
  },
});

type Scope = 'all' | 'creative' | 'fast' | 'work';

const scopeOptions = [
  { value: 'all', label: 'All' },
  { value: 'fast', label: 'fast', tint: 'virtual-model' },
  { value: 'creative', label: 'creative', tint: 'virtual-model' },
  { value: 'work', label: 'work' },
] as const satisfies readonly { value: Scope; label: string; tint?: string }[];

function markInkOf(segment: Element): string {
  const mark = segment.querySelector('[aria-hidden="true"]');

  return mark === null ? 'no mark' : getComputedStyle(mark).backgroundColor;
}

function ControlledScope() {
  const [scope, setScope] = useState<Scope>('all');

  return (
    <SegmentedControl label="Scope" onChangeValue={setScope} options={scopeOptions} value={scope} />
  );
}

/**
 * Segments standing for roles, each led by a mark in its own role ink.
 *
 * @summary Reach for the tint where the segments name things a person also sees somewhere else,
 * so the strip and that other surface read as the same set. The mark carries no name of its own,
 * because the segment's label already said it once.
 */
export const RoleTinted = meta.story({
  render: () => <ControlledScope />,
  play: async ({ canvas, userEvent }) => {
    const creative = await canvas.findByRole('radio', { name: 'creative' });
    const work = await canvas.findByRole('radio', { name: 'work' });
    const plain = await canvas.findByRole('radio', { name: 'All' });

    await expect(markInkOf(creative)).not.toBe(markInkOf(work));
    await expect(markInkOf(creative)).not.toBe('rgba(0, 0, 0, 0)');
    await expect(plain.querySelector('[aria-hidden="true"]')).toBeNull();

    await userEvent.click(creative);

    await expect(creative).toHaveAttribute('aria-checked', 'true');
    await expect(plain).toHaveAttribute('aria-checked', 'false');
  },
});

type Outcome = 'quiet' | 'passing' | 'failing';

const outcomeOptions = [
  { value: 'quiet', label: 'Quiet' },
  { value: 'passing', label: 'Passing', tone: 'positive' },
  { value: 'failing', label: 'Failing', tone: 'danger' },
] as const;

function ControlledOutcome() {
  const [outcome, setOutcome] = useState<Outcome>('quiet');

  return (
    <SegmentedControl
      label="Outcome"
      onChangeValue={setOutcome}
      options={outcomeOptions}
      value={outcome}
    />
  );
}

/** Semantic option inks hold whether the option rests or stands selected. */
export const SemanticTones = meta.story({
  render: () => <ControlledOutcome />,
  play: async ({ canvas, userEvent }) => {
    const success = await canvas.findByRole('radio', { name: 'Passing' });
    const errors = await canvas.findByRole('radio', { name: 'Failing' });

    await expect(success).toHaveClass('text-running-ink');
    await expect(errors).toHaveClass('text-danger-ink');

    await userEvent.click(success);

    await expect(success).toHaveAttribute('aria-checked', 'true');
    await expect(success).toHaveClass('text-running-ink');

    await userEvent.click(errors);

    await expect(errors).toHaveAttribute('aria-checked', 'true');
    await expect(errors).toHaveClass('text-danger-ink');
  },
});

/** The same control under the dark scheme, where the selected segment lifts off the track. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  render: () => <ControlledThemeChoice />,
});

/** The role-tinted strip in the dark scheme, where each mark has to hold against the track. */
export const RoleTintedDarkScheme = meta.story({
  globals: { theme: 'dark' },
  render: () => <ControlledScope />,
});
