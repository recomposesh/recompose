import { GATEWAY_PORT_BAND } from '@recompose/contracts';
import { createHash } from 'node:crypto';

const lastInBand = GATEWAY_PORT_BAND.first + GATEWAY_PORT_BAND.count - 1;

function bandPlaceOf(installFolder: string): number {
  return (
    createHash('sha256').update(installFolder).digest().readUInt32BE(0) % GATEWAY_PORT_BAND.count
  );
}

function bandFrom(installFolder: string): number[] {
  const place = bandPlaceOf(installFolder);

  return Array.from(
    { length: GATEWAY_PORT_BAND.count },
    (_unused, step) => GATEWAY_PORT_BAND.first + ((place + step) % GATEWAY_PORT_BAND.count),
  );
}

/**
 * The port a new gateway is offered.
 *
 * @summary Where an install enters the published band follows from its own folder, so two
 * installs on one machine never race for the same port. The walk wraps rather than running past
 * the top, and exhausting the band fails rather than wandering into the ephemeral pool.
 */
export async function offerFreePort(
  taken: ReadonlySet<number>,
  installFolder: string,
  portIsFree: (port: number) => Promise<boolean>,
): Promise<number> {
  for (const port of bandFrom(installFolder)) {
    if (!taken.has(port) && (await portIsFree(port))) {
      return port;
    }
  }

  throw new Error(
    `recompose gives gateways the ports ${String(GATEWAY_PORT_BAND.first)} through ${String(lastInBand)}, and a stored gateway or another process holds every one of them.`,
  );
}
