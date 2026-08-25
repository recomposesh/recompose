import type { FoundSource } from '../../model/found-source';

import { markFor } from '../../../../entities/provider';
import { BrandMark, Icon } from '../../../../shared/ui';

type SourceRowProps = {
  /** The source this row stands for. */
  source: FoundSource;
  /** Whether the person has this source marked. */
  marked: boolean;
  /** One quiet line under the row, where the source carries a condition worth reading. */
  note?: string | undefined;
  /** Marks the source or clears the mark. */
  onToggle: () => void;
};

function boxTone(marked: boolean): string {
  return marked
    ? 'border-accent bg-accent text-highlight-ink'
    : 'border-line-field bg-surface-card';
}

/**
 * One source a person can mark, carrying what tells it apart from another of the same provider.
 *
 * @summary The chip beside the name is the identity rather than decoration: two Claude plans read
 * the same until the account is on screen, and a person marking the wrong one would not find out
 * until a request spent the wrong plan.
 */
export function SourceRow({ source, marked, note, onToggle }: SourceRowProps) {
  const mark = markFor(source.provider);

  return (
    <button
      aria-pressed={marked}
      className="flex w-full items-start gap-2.5 px-3.5 py-2.75 text-start focus-ring-fill row-hover"
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden
        className={`mt-0.5 flex size-3.75 shrink-0 items-center justify-center rounded-mark border ${boxTone(marked)}`}
      >
        {marked ? <Icon className="size-2.5" name="check" /> : null}
      </span>
      {mark === undefined ? null : <BrandMark className="mt-0.25 size-4 shrink-0" name={mark} />}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-card-title text-ink">{source.title}</span>
          <span className="rounded-chip bg-surface-tint px-1.5 py-px font-mono text-mono-caption text-ink-secondary">
            {source.identity}
          </span>
        </span>
        {note === undefined ? null : <span className="text-detail text-ink-secondary">{note}</span>}
      </span>
    </button>
  );
}
