import type { EngineGateway } from '@recompose/contracts';

import { Hono } from 'hono';

import type { RouterServing, SpendGrantFor, SubscriptionRuntime } from './gateway-proxy';
import type { RoutingMemory } from './gateway-routing-memory';
import type { NoteTraffic, ServeWatched } from './gateway-traffic';
import type { ProxyDialect } from './gateway-wire';
import type { PluginHost } from './plugin-host';
import type { ProviderLogStore } from './provider/provider-log-store';

import { guardApiKey } from './api-key-guard';
import { modelListing } from './gateway-discovery';
import { proxyModelRequest, subscriptionRuntime } from './gateway-proxy';
import { GEMINI_MODEL_ROUTE, MODEL_ROUTES } from './gateway-route-paths';
import { routingMemory } from './gateway-routing-memory';
import { registerSideRoutes } from './gateway-side-routes';
import { noteUnreadableRequest, openServingTurn, watchingTraffic } from './gateway-traffic';
import { registerGatewayWebSockets } from './gateway-websocket';
import { InvalidJsonBodyError, refusalResponse } from './gateway-wire';
import { guardLoopback } from './loopback-guard';
import { registerManagementLogs } from './management-logs';
import { registerManagementUsage } from './management-usage';
import { type AIStudioRelay, aiStudioRelayRuntime } from './provider/ai-studio-relay';
import {
  configuredProviderLogStore,
  persistProviderObservations,
} from './provider/provider-log-runtime';
import { invalidJson, unservedPath } from './refusals';

export type { SpendGrantFor } from './gateway-proxy';

const generateContentSuffix = ':generateContent';
const streamGenerateContentSuffix = ':streamGenerateContent';

function chosenAIStudioRelay(relay?: AIStudioRelay): AIStudioRelay {
  return relay ?? aiStudioRelayRuntime();
}

function preparedLogStore(store?: ProviderLogStore): ProviderLogStore | null {
  const selected = store ?? configuredProviderLogStore();

  if (selected !== null) persistProviderObservations(selected);

  return selected;
}

function dialectForPath(path: string): ProxyDialect {
  if (isGeminiModelPath(path)) return 'gemini';

  if (path.endsWith('/interactions')) {
    return 'interactions';
  }

  if (path.endsWith('/responses')) {
    return 'responses';
  }

  return defaultDialectForPath(path);
}

function isGeminiModelPath(path: string): boolean {
  return path.includes('/models/') && path.includes('generateContent');
}

function defaultDialectForPath(path: string): ProxyDialect {
  return path.includes('/messages') ? 'anthropic' : 'chat-completions';
}

type ModelServing = {
  gateway: EngineGateway;
  memory: RoutingMemory;
  subscriptions: SubscriptionRuntime;
  fetchLike: typeof fetch;
  relay: AIStudioRelay;
  plugins?: PluginHost | undefined;
};

function registerModelRoutes(app: Hono, watched: ServeWatched, model: ModelServing): void {
  for (const [path, dialect] of MODEL_ROUTES) {
    app.all(path, async (c) =>
      watched(async (grantFor, noteAttempt) =>
        proxyModelRequest(
          c,
          dialect,
          model.gateway,
          grantFor,
          model.fetchLike,
          { memory: model.memory, noteAttempt },
          model.subscriptions,
          model.relay,
          model.plugins,
        ),
      ),
    );
  }

  registerGeminiModelRoutes(app, watched, model);
}

function registerGeminiModelRoutes(app: Hono, watched: ServeWatched, model: ModelServing): void {
  app.post(GEMINI_MODEL_ROUTE, async (c) =>
    watched(async (grantFor, noteAttempt) =>
      proxyGeminiAction(
        c,
        c.req.param('action'),
        grantFor,
        { memory: model.memory, noteAttempt },
        model,
      ),
    ),
  );
}

type GeminiAction = { model: string; stream: boolean };

function parsedGeminiAction(action: string): GeminiAction | null {
  if (action.endsWith(streamGenerateContentSuffix)) {
    return { model: action.slice(0, -streamGenerateContentSuffix.length), stream: true };
  }

  return action.endsWith(generateContentSuffix)
    ? { model: action.slice(0, -generateContentSuffix.length), stream: false }
    : null;
}

async function proxyGeminiAction(
  c: Parameters<typeof proxyModelRequest>[0],
  action: string,
  spendGrantFor: SpendGrantFor,
  serving: RouterServing,
  model: ModelServing,
): Promise<Response> {
  const parsed = parsedGeminiAction(action);

  if (parsed === null) return c.json(unservedPath(model.gateway.displayName, c.req.path), 404);

  return proxyModelRequest(
    c,
    'gemini',
    model.gateway,
    spendGrantFor,
    model.fetchLike,
    serving,
    model.subscriptions,
    model.relay,
    model.plugins,
    parsed.model,
    parsed.stream,
  );
}

function guardAndReport(app: Hono, gateway: EngineGateway): void {
  app.use(guardLoopback(gateway.port, gateway.bindAddress));

  if (gateway.apiKey !== undefined) {
    app.use(guardApiKey(gateway.displayName, gateway.apiKey));
  }

  app.use(openServingTurn(gateway.slug));

  app.onError((error, c) => {
    if (error instanceof InvalidJsonBodyError) {
      noteUnreadableRequest();

      return refusalResponse(dialectForPath(c.req.path), invalidJson(error.message));
    }

    throw error;
  });

  app.get('/health', (c) => c.json({ gateway: gateway.displayName }));
  app.on(['GET', 'HEAD'], '/healthz', (c) =>
    c.req.method === 'HEAD' ? c.body(null, 200) : c.json({ status: 'ok' }),
  );
}

export function createGatewayApp(
  gateway: EngineGateway,
  spendGrantFor: SpendGrantFor,
  fetchLike: typeof fetch = globalThis.fetch,
  subscriptions?: SubscriptionRuntime,
  aiStudio?: AIStudioRelay,
  providerLogs?: ProviderLogStore,
  plugins?: PluginHost,
  note?: NoteTraffic,
): Hono {
  const app = new Hono();
  const subscriptionServing = subscriptions ?? subscriptionRuntime();
  const relay = chosenAIStudioRelay(aiStudio);
  const logStore = preparedLogStore(providerLogs);
  const watched = watchingTraffic(spendGrantFor, note ?? (() => undefined));

  guardAndReport(app, gateway);

  app.get('/v1/models', (c) => c.json(modelListing(gateway.virtualModels)));
  registerManagementUsage(app);
  registerManagementLogs(app, logStore);
  registerGatewayWebSockets(app, gateway, spendGrantFor, fetchLike, relay);
  registerSideRoutes(app, watched, {
    gateway,
    subscriptions: subscriptionServing,
    fetchLike,
    relay,
    plugins,
  });
  registerModelRoutes(app, watched, {
    gateway,
    memory: routingMemory(),
    subscriptions: subscriptionServing,
    fetchLike,
    relay,
    plugins,
  });

  app.notFound((c) => c.json(unservedPath(gateway.displayName, c.req.path), 404));

  return app;
}
