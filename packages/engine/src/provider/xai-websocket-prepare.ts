import type { EngineGateway, SpendGrant } from '@recompose/contracts';

import type { SpendGrantFor } from '../gateway-proxy';
import type { Crossing, JsonObject } from '../gateway-wire';

import { isJsonObject } from '../gateway-wire';
import { firstDeclaredTarget } from '../routing/route-table';
import { credentialedRequestHeaders } from './credentialed-headers';
import { credentialedRequestBody } from './credentialed-target';

export type XAIWebSocketGrant = Extract<SpendGrant, { verdict: 'resolved' }> & {
  spend: { custody: 'credentialed'; provider: 'xai'; credential: string };
};
type PreparedXAITarget = {
  crossing: Crossing;
  grant: XAIWebSocketGrant;
  headers: Record<string, string>;
  key: string;
  normalized: JsonObject;
};
export type PreparedXAIResult = PreparedXAITarget | { error: string };

function xaiGrant(grant: SpendGrant): grant is XAIWebSocketGrant {
  return (
    grant.verdict === 'resolved' &&
    grant.spend.custody === 'credentialed' &&
    grant.spend.provider === 'xai'
  );
}

function boundSeatIn(gateway: EngineGateway, model: string) {
  const virtual = gateway.virtualModels.find((candidate) => candidate.id === model);

  if (virtual === undefined) {
    return null;
  }

  const declared = firstDeclaredTarget(virtual.routing);

  return declared?.standing.standing === 'bound'
    ? {
        virtualModel: virtual.id,
        routeNode: declared.routeNode,
        providerModel: declared.standing.providerModel,
      }
    : null;
}

function socketTarget(gateway: EngineGateway, message: JsonObject) {
  const body = isJsonObject(message['response']) ? message['response'] : message;
  const model = typeof body['model'] === 'string' ? body['model'] : '';
  const seat = boundSeatIn(gateway, model);

  return seat === null ? null : { body, ...seat };
}

function crossingFor(
  gateway: EngineGateway,
  target: { body: JsonObject; virtualModel: string; providerModel: string },
): Crossing {
  const session =
    typeof target.body['prompt_cache_key'] === 'string'
      ? target.body['prompt_cache_key']
      : undefined;

  return {
    dialect: 'responses',
    raw: target.body,
    gatewayName: gateway.displayName,
    virtualModel: target.virtualModel,
    providerModel: target.providerModel,
    sessionId: session,
    replayScopeId: session === undefined ? undefined : `prompt-cache:${session}`,
  };
}

function connectionKey(grant: XAIWebSocketGrant, crossing: Crossing): string {
  return `${grant.providerOrigin}\0${grant.spend.credential}\0${crossing.providerModel}`;
}

export async function prepareXAIWebSocketTarget(
  gateway: EngineGateway,
  spendGrantFor: SpendGrantFor,
  message: JsonObject,
): Promise<PreparedXAIResult> {
  const target = socketTarget(gateway, message);

  if (target === null) return { error: 'unknown virtual model' };

  const grant = await spendGrantFor(gateway.slug, target.virtualModel, target.routeNode);

  if (!xaiGrant(grant)) return { error: 'xAI target unavailable' };

  const crossing = crossingFor(gateway, target);

  return {
    crossing,
    grant,
    headers: credentialedRequestHeaders(grant.spend, crossing),
    key: connectionKey(grant, crossing),
    normalized: credentialedRequestBody(grant, crossing, target.body),
  };
}
