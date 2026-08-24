import { Menu } from '@base-ui/react/menu';

import type { MenuAction } from '../menu-action';

import { Icon } from '../icon/icon';
import { menuActionItems } from '../menu-action';

type OverflowMenuProps = {
  /** Accessible name of the control, naming what these actions act on. */
  label: string;
  /** The actions, in reading order. */
  items: readonly MenuAction[];
};

/**
 * The rest of a row's actions, held behind one control at its trailing edge.
 *
 * @summary Reach for it when a row offers more than the one or two acts that earn their own
 * control. The act a person reaches for most often belongs on the row itself, and everything
 * quieter belongs here.
 */
export function OverflowMenu({ label, items }: OverflowMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        className="flex size-6 items-center justify-center rounded-control focus-ring text-ink-secondary hover:bg-surface-hover active:bg-surface-pressed"
      >
        <Icon className="size-4" name="more" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4}>
          <Menu.Popup className="menu-surface">{menuActionItems(items)}</Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
