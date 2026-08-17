export const STAGE_WIDTH = 1312;
export const STAGE_HEIGHT = 220;

const PILL_LEFT = 396;
const PILL_RIGHT = 916;
const PILL_MID = 110;

const LEFT_WIRES = [
  { y: 20, tone: 'stroke-gateway' },
  { y: 70, tone: 'stroke-virtual-model' },
  { y: 150, tone: 'stroke-local-runtime' },
  { y: 200, tone: 'stroke-wire-dim' },
];

const RIGHT_WIRES = [
  { y: 30, tone: 'stroke-subscription' },
  { y: 90, tone: 'stroke-live' },
  { y: 160, tone: 'stroke-wire-dim' },
  { y: 210, tone: 'stroke-pending' },
];

export function CtaWires() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
    >
      {LEFT_WIRES.map(({ y, tone }) => (
        <path
          key={`l-${y}`}
          d={`M 0 ${y} C 200 ${y}, 200 ${PILL_MID}, ${PILL_LEFT} ${PILL_MID}`}
          fill="none"
          strokeWidth={2}
          className={tone}
        />
      ))}
      {RIGHT_WIRES.map(({ y, tone }) => (
        <path
          key={`r-${y}`}
          d={`M ${STAGE_WIDTH} ${y} C 1112 ${y}, 1112 ${PILL_MID}, ${PILL_RIGHT} ${PILL_MID}`}
          fill="none"
          strokeWidth={2}
          className={tone}
        />
      ))}
      <circle cx={PILL_LEFT} cy={PILL_MID} r={4.5} className="fill-router" />
      <circle cx={PILL_RIGHT} cy={PILL_MID} r={4.5} className="fill-subscription" />
    </svg>
  );
}
