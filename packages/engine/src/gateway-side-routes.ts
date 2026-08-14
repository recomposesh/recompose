import type { EngineGateway } from '@recompose/contracts';
import type { Hono } from 'hono';

import type { SubscriptionRuntime } from './gateway-proxy';
import type { ServeWatched } from './gateway-traffic';
import type { PluginHost } from './plugin-host';
import type { AIStudioRelay } from './provider/ai-studio-relay';

import { proxyCodexAlphaSearch } from './gateway-codex-alpha-search';
import { proxyCodexCompactRequest } from './gateway-codex-compact';
import { proxyTokenCountRequest } from './gateway-count-tokens';
import { proxyImageRequest } from './gateway-images';
import {
  ALPHA_SEARCH_PATHS,
  COMPACT_PATHS,
  COUNT_TOKENS_PATHS,
  IMAGE_ROUTES,
  VIDEO_ROUTES,
} from './gateway-route-paths';
import { proxyVideoRequest } from './gateway-videos';

export type SideServing = {
  gateway: EngineGateway;
  subscriptions: SubscriptionRuntime;
  fetchLike: typeof fetch;
  relay: AIStudioRelay;
  plugins?: PluginHost | undefined;
};

/**
 * Every path that serves one target rather than a table, wired onto one gateway app.
 *
 * @summary Counting tokens, compacting, searching, drawing, and filming each need one account and
 * one provider model, so none of them walks a ladder and all of them resolve the first target the
 * table declares. Registering them together keeps that shared fact in one place rather than five.
 */
export function registerSideRoutes(app: Hono, watched: ServeWatched, side: SideServing): void {
  for (const path of ALPHA_SEARCH_PATHS) {
    app.post(path, async (c) =>
      watched(async (grantFor) => proxyCodexAlphaSearch(c, side.gateway, grantFor, side.fetchLike)),
    );
  }

  for (const path of COUNT_TOKENS_PATHS) {
    app.post(path, async (c) =>
      watched(async (grantFor) =>
        proxyTokenCountRequest(
          c,
          side.gateway,
          grantFor,
          side.subscriptions,
          side.fetchLike,
          side.relay,
          side.plugins,
        ),
      ),
    );
  }

  for (const path of COMPACT_PATHS) {
    app.post(path, async (c) =>
      watched(async (grantFor) =>
        proxyCodexCompactRequest(c, side.gateway, grantFor, side.subscriptions, side.fetchLike),
      ),
    );
  }

  registerMediaRoutes(app, watched, side);
}

function registerMediaRoutes(app: Hono, watched: ServeWatched, side: SideServing): void {
  for (const [route, path] of IMAGE_ROUTES) {
    app.post(route, async (c) =>
      watched(async (grantFor) =>
        proxyImageRequest(c, side.gateway, path, grantFor, side.subscriptions, side.fetchLike),
      ),
    );
  }

  for (const [route, path] of VIDEO_ROUTES) {
    app.post(route, async (c) =>
      watched(async (grantFor) =>
        proxyVideoRequest(c, side.gateway, path, grantFor, side.fetchLike),
      ),
    );
  }
}
