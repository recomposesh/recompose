import { BeamedEighths } from './beamed-eighths';
import { FlaggedEighth } from './flagged-eighth';
import { QuarterNote } from './quarter-note';

const STAFF_LINES = [40, 48, 56, 64, 72];
const QUARTERS = [
  { x: 850, y: 64 },
  { x: 1078, y: 44 },
  { x: 1186, y: 56 },
];
const PAIRS = [
  { x: 950, y1: 56, y2: 48 },
  { x: 1114, y1: 64, y2: 56 },
];
const FLAGGED = [{ x: 1035, y: 52 }];

export function DocsBackdrop() {
  return (
    <div aria-hidden className="docs-backdrop">
      <svg viewBox="0 0 1200 150" preserveAspectRatio="xMaxYMin slice" className="size-full">
        <g stroke="currentColor" strokeWidth={1}>
          {STAFF_LINES.map((y) => (
            <line key={y} x1={0} x2={1200} y1={y} y2={y} />
          ))}
        </g>
        <g className="text-staff-note" fill="currentColor" stroke="currentColor">
          {QUARTERS.map((note) => (
            <QuarterNote key={note.x} x={note.x} y={note.y} />
          ))}
          {PAIRS.map((pair) => (
            <BeamedEighths key={pair.x} x={pair.x} y1={pair.y1} y2={pair.y2} />
          ))}
          {FLAGGED.map((note) => (
            <FlaggedEighth key={note.x} x={note.x} y={note.y} />
          ))}
        </g>
      </svg>
    </div>
  );
}
