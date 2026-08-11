import type { ReactNode } from 'react';

import { useId } from 'react';

type NavGroupProps = {
  /** The uppercase word the sidebar files this group under. */
  title: string;
  /** The rows the group gathers, which every sidebar supplies as its own links. */
  children: ReactNode;
};

/**
 * One labelled group of sidebar rows, standing under its own heading.
 *
 * @summary Reach for it for every sidebar section, so each group announces itself to assistive
 * tech through the same labelled landmark and no sidebar reinvents the heading strip.
 */
export function NavGroup({ title, children }: NavGroupProps) {
  const groupId = useId();

  return (
    <div aria-labelledby={groupId} className="flex flex-col gap-px" role="group">
      <h2 className="nav-group" id={groupId}>
        {title}
      </h2>
      {children}
    </div>
  );
}
