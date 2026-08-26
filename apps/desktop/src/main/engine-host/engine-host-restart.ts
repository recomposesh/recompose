import type { EngineGateway, EngineReport, GatewayEngineState } from '@recompose/contracts';

/**
 * Everything a restart reaches: the two directives, the gateways one is standing over, and the
 * word written down when it never comes back up.
 *
 * @summary The lane is handed in rather than reached for, so the restart says what it does to a
 * gateway without knowing how a directive crosses to the child or how a window hears an outcome.
 */
export type RestartLane = {
  /** The gateways a restart is standing over, whose stop is a step rather than an outcome. */
  restarting: Set<string>;
  stop: (slug: string) => Promise<GatewayEngineState>;
  start: (gateway: EngineGateway) => Promise<GatewayEngineState>;
  /** Writes a gateway down as stopped and tells every window, for a restart nothing answered. */
  wentQuiet: (slug: string) => void;
};

/**
 * Whether this stop is the middle of a restart rather than a gateway coming to rest.
 *
 * @summary A restart stops and starts, so publishing the stop would have every window read the
 * gateway as down for the moment in between and paint it that way. That moment is not a standing a
 * person can act on, and the act it interrupts is the save they just made. The desks still hear
 * the stop, because a request in flight really does die with the listener; only the word to the
 * windows waits for what the restart comes to.
 */
export function midRestart(
  restarting: ReadonlySet<string>,
  report: Extract<EngineReport, { kind: 'state' }>,
): boolean {
  return report.state.status === 'stopped' && restarting.has(report.slug);
}

/**
 * Stops a gateway and stands it back up on its fresh snapshot, saying what it came to either way.
 *
 * @summary Every composition edit lands here, so the outcome cannot be dropped: a restart that
 * never came back up would otherwise leave every window reading the gateway it just saved as
 * serving, while requests to it are refused and nothing on screen explains why. Writing the
 * gateway down as stopped is what puts that fact where a person can see it and act on it, and the
 * refusal still reaches the caller so a lane holding this gateway learns it too.
 *
 * The stop in the middle is held back from the windows while this stands, because it is a step of
 * one act rather than a standing of its own.
 */
export async function restartGateway(
  lane: RestartLane,
  gateway: EngineGateway,
): Promise<GatewayEngineState> {
  lane.restarting.add(gateway.slug);

  try {
    await lane.stop(gateway.slug).catch((error: unknown) => {
      console.error(
        `recompose never heard the stop of the gateway "${gateway.slug}" back, and is starting it again regardless.`,
        error,
      );
    });

    return await lane.start(gateway);
  } catch (error: unknown) {
    lane.wentQuiet(gateway.slug);

    throw error;
  } finally {
    lane.restarting.delete(gateway.slug);
  }
}
