import type { ReactElement, ReactNode } from 'react';

import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';

import type { MenuAction } from '../menu-action';

import { menuActionItems } from '../menu-action';

type ContextMenuProps = {
  /** The acts the surface offers, in reading order. */
  items: readonly MenuAction[];
  /** Classes the surface itself wears, since the trigger is that surface rather than a wrapper. */
  className?: string | undefined;
  /** The element the surface renders as, wherever a plain box is the wrong thing to stand in. */
  render?: ReactElement | undefined;
  /** What the surface draws, which is the row, card, or strip a person right-clicks. */
  children: ReactNode;
};

/**
 * A surface's own acts, raised where a person pressed rather than at a control they had to find.
 *
 * @summary Reach for it on any surface whose acts a person would look for by right-clicking: a
 * row, a card, a strip. It takes the same act list the trailing control takes, so a surface
 * offering both declares its acts once and neither way in can drift from the other. The surface
 * itself is the trigger rather than a box around it, which keeps the layout it already had.
 */
export function ContextMenu({ items, className, render, children }: ContextMenuProps) {
  return (
    <BaseContextMenu.Root>
      <BaseContextMenu.Trigger className={className} render={render}>
        {children}
      </BaseContextMenu.Trigger>
      <BaseContextMenu.Portal>
        <BaseContextMenu.Positioner>
          <BaseContextMenu.Popup className="menu-surface">
            {menuActionItems(items)}
          </BaseContextMenu.Popup>
        </BaseContextMenu.Positioner>
      </BaseContextMenu.Portal>
    </BaseContextMenu.Root>
  );
}
