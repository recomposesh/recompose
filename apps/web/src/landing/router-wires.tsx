import { CHAMFER_INNER, CHAMFER_OUTER } from './chamfer';
import { TickStrip } from './tick-strip';

export const PANEL_WIDTH = 1312;
export const PANEL_HEIGHT = 420;

export function RouterWires() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`}
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
    >
      <path d="M24 210 L96 210" strokeWidth={2.6} className="stroke-live" fill="none" />
      <circle cx={52} cy={210} r={4} className="fill-live" />
      <g transform="translate(100 166)">
        <path d={CHAMFER_OUTER} strokeWidth={1.5} className="fill-stage-card stroke-router" />
        <path d={CHAMFER_INNER} strokeWidth={1.5} className="stroke-router" fill="none" />
        <circle cx={0} cy={44} r={4.5} className="fill-router" />
        <circle cx={184} cy={44} r={4.5} className="fill-router" />
      </g>
      <path
        d="M288 210 C340 210, 340 137, 410 137"
        strokeWidth={2.6}
        className="stroke-wire"
        fill="none"
      />
      <path
        d="M288 210 C340 210, 340 285, 410 285"
        strokeWidth={2.6}
        className="stroke-live"
        fill="none"
      />
      <TickStrip strip="work" y={130} />
      <TickStrip strip="personal" y={278} />
      <line x1={930} y1={96} x2={930} y2={316} strokeDasharray="8 6" className="stroke-wire" />
    </svg>
  );
}
