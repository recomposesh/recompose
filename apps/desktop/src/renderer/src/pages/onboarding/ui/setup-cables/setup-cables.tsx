type Cable = {
  /** The curve the cable runs, drawn on the box the whole field is set in. */
  runs: string;
  /** The tone the cable carries, which is the colour its far end would plug into. */
  tone: string;
  /** How heavy the line reads, so the near cables sit forward of the far ones. */
  weight: number;
};

const CABLES: readonly Cable[] = [
  { runs: 'M0 210c320-120 760 90 1440-60', tone: 'stroke-cable-resting', weight: 2 },
  { runs: 'M0 120c500-80 980 100 1440-60', tone: 'stroke-gateway', weight: 2.5 },
  { runs: 'M0 320c380-60 1040-200 1440-20', tone: 'stroke-virtual-model', weight: 2 },
  { runs: 'M0 260c420-100 900 80 1440-30', tone: 'stroke-cable-resting', weight: 2 },
];

const FIELD = { width: 1440, height: 380 };

/**
 * The cable field the welcome step opens against.
 *
 * @summary It carries no meaning a person has to read, so it hides from the accessibility tree and
 * takes no pointer. The curves are the ones the download page already runs, because a person who
 * arrives from the site should meet the same drawing rather than a second version of it.
 */
export function SetupCables() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-95 w-full"
      fill="none"
      preserveAspectRatio="none"
      viewBox={`0 0 ${String(FIELD.width)} ${String(FIELD.height)}`}
    >
      {CABLES.map((cable) => (
        <path
          className={cable.tone}
          d={cable.runs}
          key={cable.runs}
          strokeWidth={cable.weight}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
