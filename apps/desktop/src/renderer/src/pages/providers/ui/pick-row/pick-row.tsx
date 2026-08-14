import type { ReactNode } from 'react';

import { Badge, Icon } from '../../../../shared/ui';

type PickRowProps = {
  /** The mark, disc or glyph the row leads with, so a person finds the row by its shape. */
  lead: ReactNode;
  /** What picking this row reaches, read as the row's own first line. */
  title: string;
  /** The plan the thing it names holds, where its records name one. */
  badge?: string | undefined;
  /** What picking it does, or how the thing it names stands, in one quiet line beneath. */
  under: string;
  /** The name a screen reader announces the row by, which the two lines together never spell. */
  label: string;
  /** Stands the row inert while another act on the step runs. */
  disabled?: boolean;
  /** What the row carries out, which is the whole of the row rather than a control inside it. */
  onPick: () => void;
};

/**
 * One way in, offered as a whole row rather than a card with a button inside it.
 *
 * @summary Reach for it where a step offers a person two ways to the same end and neither one
 * outranks the other. Every way reads at the same weight, the chevron says the row leads somewhere,
 * and the sheet's foot keeps only Cancel, so nothing competes with the choice being made.
 */
export function PickRow({
  lead,
  title,
  badge,
  under,
  label,
  disabled = false,
  onPick,
}: PickRowProps) {
  return (
    <button
      aria-label={label}
      className="flex w-full items-center gap-2.5 focus-ring px-3 py-2.5 text-start row-hover disabled:text-ink-secondary"
      disabled={disabled}
      onClick={onPick}
      type="button"
    >
      <span className="flex size-6 shrink-0 items-center justify-center">{lead}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body text-ink">{title}</span>
          {badge === undefined ? null : <Badge>{badge}</Badge>}
        </span>
        <span className="text-detail text-ink-secondary">{under}</span>
      </span>
      <Icon className="size-3.5 shrink-0 -rotate-90 text-ink-secondary" name="chevron" />
    </button>
  );
}
