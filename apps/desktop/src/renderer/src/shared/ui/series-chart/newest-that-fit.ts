const MIN_SLOT_WIDTH = 4;

/**
 * The trailing buckets that keep at least the minimum slot width, so a crowded axis drops the
 * oldest history rather than thinning every bar.
 *
 * @summary The chart folds through it before drawing, and a table twin can mirror exactly what
 * draws by folding through the same rule.
 */
export function newestThatFit<Bar>(bars: readonly Bar[], width: number): readonly Bar[] {
  const slots = Math.floor(width / MIN_SLOT_WIDTH);

  return bars.length <= slots ? bars : bars.slice(bars.length - slots);
}
