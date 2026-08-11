import type { Hono } from 'hono';

import { createAdaptorServer, type ServerType } from '@hono/node-server';
import { DEFAULT_GATEWAY_BIND_ADDRESS } from '@recompose/contracts';
import { createServer } from 'node:http';

import { NodeWebSocketServer } from './node-websocket-server';

export type GatewayListeners = {
  close: () => Promise<void>;
};

type BoundListener = { server: ServerType; websocket: NodeWebSocketServer };
type BindOutcome = { bound: BoundListener } | { refused: 'port-taken' | 'address-unavailable' };

type OpenOutcome = { opened: GatewayListeners } | { failed: { port: number } };

async function bindTo(app: Hono, address: string, port: number): Promise<BindOutcome> {
  return new Promise<BindOutcome>((settle) => {
    const websocket = new NodeWebSocketServer();
    const server = createAdaptorServer({
      fetch: app.fetch,
      createServer,
      websocket: { server: websocket },
    });

    const refuseTheBind = (error: NodeJS.ErrnoException): void => {
      settle({ refused: error.code === 'EADDRINUSE' ? 'port-taken' : 'address-unavailable' });
    };

    server.once('error', refuseTheBind);
    server.listen({ port, host: address }, () => {
      server.off('error', refuseTheBind);
      server.on('error', (error: NodeJS.ErrnoException) => {
        console.error(`The gateway listening on ${address}:${String(port)} hit an error.`, error);
      });
      settle({ bound: { server, websocket } });
    });
  });
}

function closeAllConnections(server: ServerType): void {
  if ('closeAllConnections' in server && typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
}

async function stopServing(bound: BoundListener): Promise<void> {
  bound.websocket.terminateAll();
  bound.websocket.close();

  return new Promise<void>((settle) => {
    bound.server.close(() => {
      settle();
    });
    closeAllConnections(bound.server);
  });
}

function isBound(outcome: BindOutcome): outcome is { bound: BoundListener } {
  return 'bound' in outcome;
}

export async function openGatewayListeners(
  app: Hono,
  port: number,
  address = DEFAULT_GATEWAY_BIND_ADDRESS,
): Promise<OpenOutcome> {
  const outcome = await bindTo(app, address, port);

  if (!isBound(outcome)) {
    return { failed: { port } };
  }

  return {
    opened: {
      close: async () => stopServing(outcome.bound),
    },
  };
}
