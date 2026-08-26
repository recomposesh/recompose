import { createServer } from 'node:http';

export type LoopbackAsk = {
  /** The unguessable word the callback has to carry back, which binds it to this ask. */
  state: string;
  /** How long the callback is waited for before the sign-in gives the port back. */
  boundMs: number;
  callbackPort: number;
  /** The path the vendor registered its redirect under, which differs vendor by vendor. */
  path: string;
};

export type LoopbackHanded = { code: string } | { reason: string };

/**
 * @summary Every vendor here matches its client's redirect exactly, so the address a sign-in sends
 * and the address it listens on are one string rather than two that could drift.
 */
export function loopbackRedirectUri(callbackPort: number, path: string): string {
  return `http://localhost:${String(callbackPort)}${path}`;
}

const CLOSING_PAGE =
  '<!doctype html><meta charset="utf-8"><title>recompose</title>' +
  '<p style="font:14px -apple-system,sans-serif;padding:2rem">Signed in. You can close this tab.</p>';

/**
 * Holds the one loopback port a vendor is told to come back to, until it does.
 *
 * @summary A redirect answers a browser rather than a request, so the only way to hear the code is
 * to be listening where the ask said the answer goes. The answer waits on the listener having
 * actually let go, keep-alive connections included, because a person who abandons one sign-in and
 * starts another would otherwise be told nothing could listen on the port. The state is compared
 * here rather than trusted, so a stray callback settles nothing.
 */
export async function awaitLoopbackCallback(ask: LoopbackAsk): Promise<LoopbackHanded> {
  return new Promise<LoopbackHanded>((settle) => {
    const server = createServer((request, response) => {
      const asked = new URL(request.url ?? '/', loopbackRedirectUri(ask.callbackPort, ask.path));

      response.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        connection: 'close',
      });
      response.end(CLOSING_PAGE);

      const code = asked.searchParams.get('code');
      const said = asked.searchParams.get('state');

      if (asked.searchParams.get('error') !== null) {
        done({ reason: 'The sign-in was denied in the browser.' });
      } else if (code === null || said !== ask.state) {
        done({ reason: 'The browser came back without the code this sign-in asked for.' });
      } else {
        done({ code });
      }
    });

    const giveUp = setTimeout(() => {
      done({ reason: 'The sign-in was not finished in the browser in time.' });
    }, ask.boundMs);

    let settled = false;

    function done(handed: LoopbackHanded): void {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(giveUp);
      server.closeAllConnections();
      server.close(() => {
        settle(handed);
      });
    }

    server.on('error', () => {
      done({ reason: `Nothing could listen on port ${String(ask.callbackPort)}.` });
    });
    server.listen(ask.callbackPort, '127.0.0.1');
  });
}
