type ScopeSegment = {
  /** What the segment stands for, unique along the path. */
  key: string;
  /** The name the segment prints. */
  label: string;
};

type ScopePathProps = {
  /** The widest view's name, standing before every segment. */
  rootLabel: string;
  /** The narrowing levels in drill order. */
  segments: readonly ScopeSegment[];
  /** Receives how many leading segments survive the press: zero clears them all. */
  onTruncate: (keptCount: number) => void;
};

const pressableSegment = 'rounded-control focus-ring px-1 text-ink-secondary row-hover';

/**
 * The standing scope drawn as a path over the hierarchy, where pressing a segment truncates to it.
 *
 * @summary The deepest segment names the current view and takes no press, every wider one is a
 * button back out, and the root clears the scope whole. The path is a navigation landmark, so
 * assistive tech lists it by name.
 */
export function ScopePath({ rootLabel, segments, onTruncate }: ScopePathProps) {
  return (
    <nav aria-label="Scope">
      <ol className="flex items-center gap-1 text-detail">
        <li>
          {segments.length === 0 ? (
            <span aria-current="page" className="px-1 text-ink">
              {rootLabel}
            </span>
          ) : (
            <button
              className={pressableSegment}
              onClick={() => {
                onTruncate(0);
              }}
              type="button"
            >
              {rootLabel}
            </button>
          )}
        </li>
        {segments.map((segment, place) => (
          <li className="flex items-center gap-1" key={segment.key}>
            <span aria-hidden className="text-ink-secondary">
              ›
            </span>
            {place === segments.length - 1 ? (
              <span aria-current="page" className="px-1 font-medium text-ink">
                {segment.label}
              </span>
            ) : (
              <button
                className={pressableSegment}
                onClick={() => {
                  onTruncate(place + 1);
                }}
                type="button"
              >
                {segment.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
