type QuietAct = {
  /** What the act offers, read as the link's own words. */
  label: string;
  /** Runs the act the label names. */
  onPress: () => void;
};

type QuietReadingProps = {
  /** What is missing, said in as few words as the reading allows. */
  title: string;
  /** The one line qualifying the title, naming the window or what fills it. */
  sentence: string;
  /** The single way out, absent where the reading offers none. */
  act?: QuietAct | undefined;
};

const GLYPH_BARS = [10, 18, 26];

function glyph() {
  return (
    <span aria-hidden className="flex items-end gap-1">
      {GLYPH_BARS.map((tall) => (
        <span
          className="w-2 rounded-t-mark bg-ink-tertiary"
          key={tall}
          style={{ height: `${String(tall)}px` }}
        />
      ))}
    </span>
  );
}

/**
 * What a panel prints where a reading would stand, when the window holds nothing to read.
 *
 * @summary Reach for it wherever a fold comes back empty: the drawing keeps its own frame and its
 * axis, and this stands in the middle of them rather than collapsing the panel. The act is a plain
 * link rather than a button, because widening a window undoes itself and never earns the weight of
 * a filled control.
 */
export function QuietReading({ title, sentence, act }: QuietReadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      {glyph()}
      <p className="text-card-title text-ink">{title}</p>
      <p className="text-caption text-ink-secondary">{sentence}</p>
      {act === undefined ? null : (
        <button
          className="rounded-control focus-ring px-1 py-0.5 text-detail text-accent-ink"
          onClick={() => {
            act.onPress();
          }}
          type="button"
        >
          {act.label}
        </button>
      )}
    </div>
  );
}
