import type { Page } from '@playwright/test';

import { expect } from '@playwright/test';
import { connect } from 'node:net';

import { addressOfPort, namesListedAt } from './gateway-client';
import { storedGateway } from './gateway-screen';
import { focusedGateway } from './scenario-memory';

/** A bare connection a scenario parks on a serving gateway, and whether that gateway dropped it. */
type ParkedConnection = { dropped: () => boolean; letGo: () => void };

/**
 * Parks a connection on a serving gateway, which its listener destroys the moment it closes.
 *
 * @summary Nothing is ever sent down it. The connection exists only to be broken: a listener
 * closing tears down every connection it holds, idle ones included, so the break is a latch a
 * later read cannot fall between. Polling the port for a refusal instead would have to catch a
 * window a few milliseconds wide, and would pass by luck on a slow machine.
 */
async function aConnectionParkedOn(port: number): Promise<ParkedConnection> {
  return new Promise<ParkedConnection>((settle, refuse) => {
    let dropped = false;
    const socket = connect({ host: '127.0.0.1', port });

    socket.on('error', (failure: Error) => {
      refuse(failure);
    });
    socket.on('close', () => {
      dropped = true;
    });
    socket.once('connect', () => {
      settle({
        dropped: () => dropped,
        letGo: () => {
          socket.destroy();
        },
      });
    });
  });
}

/**
 * Carries out one write through the app and waits for the gateway it rewrote to serve it.
 *
 * @summary Rewriting a serving gateway's document restarts it behind the answer rather than in
 * front of it, so a turn sent straight after a person pressed Save would reach the snapshot the
 * old listener still held, or reach no listener at all. Waiting for the parked connection to break
 * says the old listener is gone, and the listing answering again says the new one stands, which
 * between them are the only two facts a request needs before it can prove anything about the edit.
 */
export async function theGatewayServesTheWrite(
  page: Page,
  write: () => Promise<void>,
): Promise<void> {
  const { port } = await storedGateway(page, focusedGateway(page));
  const parked = await aConnectionParkedOn(port);

  try {
    await write();

    await expect
      .poll(() => parked.dropped(), { message: 'the rewritten gateway never closed its listener' })
      .toBe(true);
  } finally {
    parked.letGo();
  }

  await expect.poll(async () => namesListedAt(addressOfPort(port))).not.toEqual([]);
}
