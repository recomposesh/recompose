import type { GatewayConfig, GatewayTraffic, RequestOutcome } from '@recompose/contracts';

/** How a cable reads: a stored binding at rest or carrying traffic, one whose account left, one of the two the overlay draws, or the gateway's own wire to a card it serves. */
export type CableStanding =
  | 'resting'
  | 'live'
  | 'served'
  | 'failed'
  | 'broken'
  | 'draft'
  | 'pending'
  | 'structural';

/** What a request the gateway refused or could not finish came to, as a person reads it. */
export type CableFailure = { status: number; detail: string };

/** The latest outcome of every route node this gateway served, under its model, warm ones only. */
export type CarriedTraffic = Readonly<Record<string, Readonly<Record<string, RequestOutcome>>>>;

const CABLE_TRAFFIC_MEMORY_MS = 60_000;

/**
 * Whether a carried outcome still deserves its tint: a live request always, a served one for a
 * minute, and a failure until newer traffic answers it, because a break needs a person to see it.
 */
function stillWarm(carried: RequestOutcome, now: number): boolean {
  if (carried.outcome === 'served') {
    return now - carried.at <= CABLE_TRAFFIC_MEMORY_MS;
  }

  return true;
}

function warmNodes(
  nodes: Readonly<Record<string, RequestOutcome>>,
  now: number,
): readonly (readonly [string, RequestOutcome])[] {
  return Object.entries(nodes).filter(([, carried]) => stillWarm(carried, now));
}

/**
 * What each route node of a gateway's virtual models last came to, once the cold readings fall away.
 *
 * @summary A served reading cools back to rest once the minute passes it by, because a warm tint is
 * a claim about now rather than a plaque about ever, and a failure stays until newer traffic answers
 * it, since a break is a thing a person has to see. The node level is what lets one request paint
 * two cables: the child a ladder moved on from and the one that answered each keep their own.
 */
export function carriedBy(
  gateway: GatewayConfig,
  traffic: GatewayTraffic,
  now: number,
): CarriedTraffic {
  const flowed = traffic[gateway.slug] ?? {};

  return Object.fromEntries(
    Object.entries(flowed).flatMap(([modelId, nodes]) => {
      const warm = warmNodes(nodes, now);

      return warm.length === 0 ? [] : [[modelId, Object.fromEntries(warm)] as const];
    }),
  );
}

/**
 * The newest reading among a virtual model's route nodes, or nothing where none stayed warm.
 *
 * @summary One request walking a ladder leaves a reading under every node it tried, and the
 * gateway's wire belongs to the model rather than to a node, so it shows the attempt that landed
 * last. Two readings from the same instant settle on the last node the table names, so the answer
 * never depends on when it was asked.
 */
export function latestAcrossNodes(
  nodes: Readonly<Record<string, RequestOutcome>> | undefined,
): RequestOutcome | undefined {
  return Object.values(nodes ?? {}).reduce<RequestOutcome | undefined>(
    (latest, carried) => (latest === undefined || carried.at >= latest.at ? carried : latest),
    undefined,
  );
}

/** The standing an outcome paints a cable, or nothing where no request has flowed. */
export function standingCarried(carried: RequestOutcome | undefined): CableStanding | undefined {
  if (carried === undefined) {
    return undefined;
  }

  if (carried.outcome === 'live') {
    return 'live';
  }

  return carried.outcome === 'served' ? 'served' : 'failed';
}

/** The error a person can press on a cable, which only a failed request leaves behind. */
export function failureCarried(carried: RequestOutcome | undefined): CableFailure | undefined {
  return carried?.outcome === 'failed'
    ? { status: carried.status, detail: carried.detail }
    : undefined;
}
