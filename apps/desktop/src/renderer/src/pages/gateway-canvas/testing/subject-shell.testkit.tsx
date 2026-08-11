import type { ReactElement, ReactNode } from 'react';

/** Frames a drawer box story at the width the inspector rests its boxes on. */
export function framedAsDrawerBox(Story: () => ReactNode): ReactElement {
  return (
    <div className="mx-auto my-4 w-76">
      <Story />
    </div>
  );
}
