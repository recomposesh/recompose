import type { ReactNode } from 'react';

type TableShellProps = {
  /** The name assistive tech reads the table by. */
  caption: string;
  /** The head and body rows the table holds. */
  children: ReactNode;
};

/**
 * A data table inside its own scrolling shell, named for assistive tech.
 *
 * @summary Reach for it wherever readings land in rows: the breakdown table and the chart's
 * data-table twin both compose it. The shell scrolls sideways on its own so a wide reading never
 * drags the page with it, and the hidden caption gives the table the name a screen reader lists
 * it by.
 */
export function TableShell({ caption, children }: TableShellProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-detail text-ink">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}
