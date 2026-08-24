import type { ReactNode } from 'react';

import type { MenuAction } from '../../../../shared/ui';

import { ContextMenu } from '../../../../shared/ui';

const CARD = 'rounded-card border border-line-subtle bg-surface-card px-4 py-2.5';

type AccountRowProps = {
  /** How the row lays its own contents out, which is the one thing the three kinds disagree on. */
  layout: string;
  /** The acts a right-click on the row raises, which are the acts its control holds as well. */
  items: readonly MenuAction[];
  /** What the row draws, which each kind of account fills in for itself. */
  children: ReactNode;
};

/**
 * The card one stored account stands on, carrying that account's acts under a right-click.
 *
 * @summary Reach for it as the shell of every row on the providers page. The card treatment and
 * the acts are one decision for all three kinds of account, so they live here rather than being
 * written out beside each kind, where the first row to change its border leaves the others behind.
 * Layout stays with the caller because a subscription stacks two lines while a key and a runtime
 * read across one, and that is the only difference between them worth keeping.
 */
export function AccountRow({ layout, items, children }: AccountRowProps) {
  return (
    <ContextMenu className={`${layout} ${CARD}`} items={items} render={<li />}>
      {children}
    </ContextMenu>
  );
}
