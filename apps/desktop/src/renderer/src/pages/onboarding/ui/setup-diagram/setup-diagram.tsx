import type { ReactElement } from 'react';

import { SetupNode } from '../setup-node/setup-node';

/** One target the router deals to, as the diagram draws it. */
export type DiagramTarget = {
  /** Which kind of source serves it, which is what tints the card. */
  kind: 'subscription' | 'local-runtime';
  /** The model this target serves. */
  model: string;
  /** The line under it, which says whose turn this target takes. */
  under: string;
};

type SetupDiagramProps = {
  /** The gateway's name. */
  gatewayName: string;
  /** The port the gateway answers on, or nothing until one stands. */
  port: string;
  /** The virtual model's id, which is what a harness asks for. */
  modelId: string;
  /** The targets the router deals between. */
  targets: readonly DiagramTarget[];
};

const FIELD = { width: 1020, height: 330 };

const CARD = { width: 184, height: 88 };

const COLUMN = { gateway: 0, model: 276, router: 552, target: 828 };

const ROW = { middle: 121, upper: 20, lower: 222 };

/**
 * @summary Both ends are absolute, because a cable that took a rise would read as correct on the
 * straight run and bow off the field on every turn, which is the shape the first draft drew.
 */
function cableTo(fromX: number, fromY: number, toY: number): string {
  const rise = toY - fromY;
  const reach = COLUMN.model - CARD.width;

  return `M${String(fromX)} ${String(fromY)}c${String(reach / 2)} 0 ${String(reach / 2)} ${String(rise)} ${String(reach)} ${String(rise)}`;
}

function targetRow(index: number, count: number): number {
  if (count === 1) {
    return ROW.middle;
  }

  return index === 0 ? ROW.upper : ROW.lower;
}

function cable(key: string, drawn: string, dimmed: boolean): ReactElement {
  return (
    <g key={key}>
      <path
        className="stroke-cable-served"
        d={drawn}
        fill="none"
        strokeLinecap="round"
        strokeWidth={2.5}
      />
      <path className={`cable-pulse stroke-cable-live ${dimmed ? 'opacity-40' : ''}`} d={drawn} />
    </g>
  );
}

function diagramLabels(): ReactElement {
  return (
    <>
      <span
        className="absolute text-caption text-ink-secondary"
        style={{ left: COLUMN.gateway + CARD.width + 18, top: ROW.middle - 8 }}
      >
        a request
      </span>
      <span
        className="absolute text-caption text-ink-secondary"
        style={{ left: COLUMN.target, top: ROW.lower + CARD.height + 12 }}
      >
        you decide this side
      </span>
    </>
  );
}

function diagramCables(targets: readonly DiagramTarget[]): ReactElement {
  const portY = CARD.height / 2;

  return (
    <svg
      aria-hidden
      className="absolute inset-0"
      fill="none"
      height={FIELD.height}
      width={FIELD.width}
    >
      {cable(
        'ask',
        cableTo(COLUMN.gateway + CARD.width, ROW.middle + portY, ROW.middle + portY),
        false,
      )}
      {targets.length > 0
        ? cable(
            'to-router',
            cableTo(COLUMN.model + CARD.width, ROW.middle + portY, ROW.middle + portY),
            false,
          )
        : null}
      {targets.map((target, index) =>
        cable(
          `turn-${target.model}`,
          cableTo(
            COLUMN.router + CARD.width,
            ROW.middle + portY,
            targetRow(index, targets.length) + portY,
          ),
          index > 0,
        ),
      )}
    </svg>
  );
}

/**
 * The graph setup is about to build, drawn before it builds it.
 *
 * @summary A person is asked to press Create on something they have not seen, so the diagram shows
 * the whole graph rather than describing it. The pulses run the router's own turn-taking, because
 * a still picture of a round-robin says nothing a still picture of a single target would not.
 */
export function SetupDiagram({ gatewayName, port, modelId, targets }: SetupDiagramProps) {
  const routed = targets.length > 0;

  return (
    <div className="relative mx-auto" style={{ height: FIELD.height, width: FIELD.width }}>
      {diagramCables(targets)}
      <div className="absolute" style={{ left: COLUMN.gateway, top: ROW.middle }}>
        <SetupNode kind="gateway" name={gatewayName} under={port} />
      </div>
      <div className="absolute" style={{ left: COLUMN.model, top: ROW.middle }}>
        <SetupNode kind="virtual-model" name="My model" under={modelId} />
      </div>
      {routed ? (
        <div className="absolute" style={{ left: COLUMN.router, top: ROW.middle }}>
          <SetupNode kind="router" name="Round-robin" under="round-robin" />
        </div>
      ) : null}
      {targets.map((target, index) => (
        <div
          className="absolute"
          key={target.model}
          style={{ left: COLUMN.target, top: targetRow(index, targets.length) }}
        >
          <SetupNode kind={target.kind} name={target.model} under={target.under} />
        </div>
      ))}
      {diagramLabels()}
    </div>
  );
}
