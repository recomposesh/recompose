import type { EngineGateway } from '@recompose/contracts';

import type { EngineHost } from './engine-host';

import { storedEngineGateway } from './stored-gateway';

export type EngineAccess = {
  host: () => EngineHost | null;
  userDataPath: () => string;
  onCorrupt: (quarantinedPath: string) => void;
};

export type GatewayLifecycleRequests = {
  start: (slug: string) => void;
  stop: (slug: string) => void;
  restart: (slug: string) => void;
  reapply: (slug: string) => void;
};

/**
 * Lifecycle requests from a surface that knows a slug and nothing else.
 *
 * @summary The menu bar carries no port and no display name, so every start and reapply reads
 * the stored document first. Nothing here answers a caller, so every failure has to be logged.
 *
 * Restart and reapply differ in who asked. A restart is a person picking Restart from the menu bar,
 * so it acts. A reapply is a changed document, so it reaches a gateway that serves and leaves a
 * stopped one stopped: editing a document is never a request to serve. The guard lives here rather
 * than in `EngineHost.restart`, which a port move calls on purpose to stand a gateway back up after
 * a conflict stopped it.
 */
export function createGatewayLifecycleRequests(access: EngineAccess): GatewayLifecycleRequests {
  function ask(act: string, slug: string, work: (host: EngineHost) => Promise<unknown>): void {
    const host = access.host();

    if (host === null) {
      console.error(`recompose could not ${act} the gateway "${slug}" before the engine was ready`);

      return;
    }

    work(host).catch((error: unknown) => {
      console.error(`recompose could not ${act} the gateway "${slug}"`, error);
    });
  }

  function askToServe(
    act: string,
    slug: string,
    serve: (host: EngineHost, gateway: EngineGateway) => Promise<unknown>,
  ): void {
    ask(act, slug, async (host) => {
      const gateway = await storedEngineGateway(access.userDataPath(), access.onCorrupt, slug);

      if (gateway === undefined) {
        throw new Error(`recompose stores no gateway under that slug.`);
      }

      return serve(host, gateway);
    });
  }

  return {
    start: (slug) => {
      askToServe('start', slug, async (host, gateway) => host.start(gateway));
    },
    stop: (slug) => {
      ask('stop', slug, async (host) => host.stop(slug));
    },
    restart: (slug) => {
      askToServe('restart', slug, async (host, gateway) => host.restart(gateway));
    },
    reapply: (slug) => {
      askToServe('reapply', slug, async (host, gateway) =>
        host.states()[slug]?.status === 'running' ? host.restart(gateway) : undefined,
      );
    },
  };
}
