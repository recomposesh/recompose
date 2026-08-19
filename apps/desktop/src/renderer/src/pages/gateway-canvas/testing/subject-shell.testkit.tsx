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

/**
 * Stands a whole subject body in the panel the inspector gives it, head, scroll, and foot.
 *
 * @summary A body is a shell rather than a box, so it needs the panel's full height and its own
 * scrolling to read the way it ships: framed as a box, a foot would float wherever the content
 * ended and no story would ever meet the layout a person does.
 */
export function framedAsDrawerPanel(body: ReactNode): ReactElement {
  return (
    <div className="flex justify-end bg-surface-content">
      <aside className="flex h-150 w-80 flex-col overflow-hidden border-s border-line-subtle bg-surface-toolbar">
        {body}
      </aside>
    </div>
  );
}
