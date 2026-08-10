const standing = {
  positive: { mark: 'bg-running', ink: 'text-running-ink' },
  attention: { mark: 'bg-attention', ink: 'text-attention-ink' },
  danger: { mark: 'bg-danger', ink: 'text-danger-ink' },
  inert: { mark: 'bg-ink-tertiary', ink: 'text-ink-secondary' },
} as const;

type StatusChipProps = {
  /** The standing the chip prints, which is the whole of what a person reads here. */
  word: string;
  /**
   * Whether the standing holds, asks for something, failed, or is a quiet fact. `positive` marks a
   * thing that needs nothing, `attention` marks one whose remedy sits beside it, `danger` marks one
   * that went wrong and stays wrong, and `inert` marks one that is nobody's fault and no alarm,
   * like a loopback server that simply isn't running.
   */
  tone: keyof typeof standing;
};

/**
 * A standing said as a word with a mark beside it.
 *
 * @summary Reach for it where a person reads how something stands and the word has to survive a
 * screen that renders no color. The mark carries no name of its own, so the word is heard once.
 * Reach for the status indicator instead where the mark stands alone with no word beside it.
 */
export function StatusChip({ word, tone }: StatusChipProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-detail ${standing[tone].ink}`}>
      <span aria-hidden className={`size-1.5 shrink-0 rounded-pill ${standing[tone].mark}`} />
      {word}
    </span>
  );
}
