import type { ReactElement, ReactNode } from 'react';

/**
 * Frames a drawer box story at the panel the inspector actually rests its boxes on.
 *
 * @summary The width is the inspector's standing width and the inset is the drawer body's own, so
 * a box measured here is the box a person gets. A frame that skipped the inset would stand every
 * story twenty-eight pixels wider than the shipped panel, which is exactly enough room to hide a
 * line that clips in the app from every assertion written against it.
 */
export function framedAsDrawerBox(Story: () => ReactNode): ReactElement {
  return (
    <div className="mx-auto my-4 w-76 bg-surface-toolbar p-3.5">
      <Story />
    </div>
  );
}
