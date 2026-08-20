import { type Server } from 'node:net';

import { dropServer, holdPort, LOOPBACK_HOSTS } from './loopback-ports';

/** Holds loopback ports away from recompose, the way a rival process on the machine would. */
export type PortSquatter = {
  take: (port: number) => Promise<void>;
  release: (port: number) => Promise<void>;
};

/** The squatter one scenario acts through, with the release its teardown owes every held port. */
export type HeldPorts = { squatter: PortSquatter; letEveryPortGo: () => Promise<void> };

/**
 * @summary Both loopback families are taken, because recompose binds whichever one the platform
 * hands it and a port held on only one would still be there for the taking. Holding neither is the
 * failure worth throwing: a scenario about a port another process took proves nothing once the port
 * is free.
 */
async function takePort(held: Map<number, Server[]>, port: number): Promise<void> {
  const holders = await Promise.all(LOOPBACK_HOSTS.map(async (host) => holdPort(host, port)));
  const bound = holders.filter((holder): holder is Server => holder !== null);

  if (bound.length === 0) {
    throw new Error(`the scenario could not take port ${String(port)} away from recompose`);
  }

  held.set(port, bound);
}

async function releasePort(held: Map<number, Server[]>, port: number): Promise<void> {
  const bound = held.get(port) ?? [];

  held.delete(port);

  await Promise.all(bound.map(dropServer));
}

export function portsHeldFromRecompose(): HeldPorts {
  const held = new Map<number, Server[]>();

  return {
    squatter: {
      take: async (port) => takePort(held, port),
      release: async (port) => releasePort(held, port),
    },
    letEveryPortGo: async () => {
      await Promise.all([...held.keys()].map(async (port) => releasePort(held, port)));
    },
  };
}
