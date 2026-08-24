import type { ReactNode } from 'react';

import { Menu } from '@base-ui/react/menu';

import type { IconName } from './icon/icon';

import { Icon } from './icon/icon';

/** The ink an act carries at rest, which names what choosing it does rather than how it looks. */
type MenuTone = 'accent' | 'danger' | 'positive';

/** One act a surface offers, wherever that surface hands its acts over to be drawn as a menu. */
export type MenuAction = {
  /** What the action reads as, which is also the name it answers to. */
  label: string;
  /** Glyph drawn leading the label, so the acts scan without reading. */
  icon?: IconName | undefined;
  /** Ink the glyph carries at rest; a highlighted act repaints it in the highlight's own ink. */
  tone?: MenuTone | undefined;
  /** Keeps the act readable but out of reach while the work it asks for is still out. */
  disabled?: boolean | undefined;
  /** Runs when a person chooses this action. */
  onSelect: () => void;
};

const toneInk: Record<MenuTone, string> = {
  accent: 'text-accent-ink',
  danger: 'text-danger-ink',
  positive: 'text-running',
};

/**
 * Draws a surface's acts as menu items, whichever control raised the menu they stand in.
 *
 * @summary Base UI builds its context menu out of the very same item, so one surface declares its
 * acts once and both the trailing control and a right-click read that one list. Two lists written
 * for one row is the failure this exists to stop: they drift the moment an act is added to one.
 */
export function menuActionItems(items: readonly MenuAction[]): ReactNode {
  return items.map((action) => (
    <Menu.Item
      className="group menu-action"
      disabled={action.disabled ?? false}
      key={action.label}
      onClick={() => {
        action.onSelect();
      }}
    >
      {action.icon === undefined ? null : (
        <Icon
          className={`size-4 group-data-highlighted:text-highlight-ink ${
            action.tone === undefined ? 'text-ink-secondary' : toneInk[action.tone]
          }`}
          name={action.icon}
        />
      )}
      {action.label}
    </Menu.Item>
  ));
}
