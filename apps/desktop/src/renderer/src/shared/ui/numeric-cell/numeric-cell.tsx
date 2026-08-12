import type { ReactNode } from 'react';

/**
 * One numeric reading in a table, aligned and figured the way every column of numbers prints.
 *
 * @summary Numbers sit at the reading's end in tabular figures, so a column of them lines up
 * digit under digit and a ticking value never jitters its neighbors sideways.
 */
export function NumericCell({ children }: { children: ReactNode }) {
  return <td className="px-2 py-1 text-end font-mono text-mono-value tabular-nums">{children}</td>;
}
