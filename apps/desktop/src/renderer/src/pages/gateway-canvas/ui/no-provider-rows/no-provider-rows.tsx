import { Link } from '@tanstack/react-router';

import { Icon } from '../../../../shared/ui';

/**
 * The absence a picker on the canvas reports, worn as rows of the menu it stands in.
 *
 * @summary The drawer says this in a block with a button, because a drawer is a surface with room
 * for one. A picker floating over the canvas is a menu, and a block inside a menu reads as a panel
 * that wandered in: the statement takes a row of its own and the way out takes the next, so the
 * pointer already traveling down the rows meets the remedy where it expects the next choice.
 */
export function NoProviderRows() {
  return (
    <>
      <div className="flex min-h-10 flex-col justify-center px-2.5 py-1">
        <span className="text-control text-ink-secondary">No provider connected yet</span>
        <span className="text-footnote text-ink-secondary">Connect one in Providers first.</span>
      </div>
      <Link
        className="flex min-h-10 w-full items-center gap-2.25 rounded-control focus-ring px-2.5 py-1 text-control row-hover"
        search={{ kind: 'subscription' }}
        to="/providers"
      >
        <Icon className="size-3.75 shrink-0 text-accent-ink" name="leave" />
        <span className="truncate text-ink">Open Providers</span>
      </Link>
    </>
  );
}
