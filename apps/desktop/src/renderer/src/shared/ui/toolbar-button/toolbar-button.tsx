import type { IconName } from '../icon/icon';

import { Icon } from '../icon/icon';
import { toolbarShape } from '../toolbar-shape';
import { Tooltip } from '../tooltip/tooltip';

type ToolbarButtonProps = {
  /** Whether the surface this control discloses stands open, absent on plain acts. */
  expanded?: boolean | undefined;
  glyph: IconName;
  label: string;
  onPress?: (() => void) | undefined;
  /** The ink the glyph takes, which the run control uses to carry its own state. */
  tone?: string;
  /** The surface it waits for, named for anyone who presses it before its machinery lands. */
  waitsFor?: string;
  where: keyof typeof toolbarShape;
};

/**
 * One control of the toolbar, whether it sits alone or inside a button group.
 *
 * @summary Every control in the strip comes from here, so a hover, a focus ring, or a size that
 * changes once changes for all of them. The label is handed to the tooltip rather than set on the
 * button, because the printed reading and the accessible name are the same string and a control
 * that carried both would let them drift.
 */
export function ToolbarButton({
  expanded,
  glyph,
  label,
  onPress,
  tone = 'text-ink-secondary',
  waitsFor,
  where,
}: ToolbarButtonProps) {
  return (
    <Tooltip label={label} note={waitsFor === undefined ? undefined : `Waits on ${waitsFor}.`}>
      <button
        aria-expanded={expanded}
        className={`app-no-drag flex items-center justify-center focus-ring hover:bg-surface-hover active:bg-surface-pressed aria-expanded:bg-surface-pressed aria-expanded:text-ink ${toolbarShape[where]} ${tone}`}
        onClick={onPress}
        type="button"
      >
        <Icon className="size-4" name={glyph} />
      </button>
    </Tooltip>
  );
}
