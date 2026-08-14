import type {
  EngineGateway,
  EngineTargetStanding,
  EngineVirtualModel,
  SpendGrant,
} from '@recompose/contracts';
import type { Context } from 'hono';

import type { SpendGrantFor } from './gateway-proxy';
import type { JsonObject } from './gateway-wire';
import type { XAIVideoPath } from './provider/xai-video';
import type { DeclaredTarget } from './routing/route-table';

type BoundTarget = DeclaredTarget & {
  standing: Extract<EngineTargetStanding, { standing: 'bound' }>;
};

import { readJsonBody } from './gateway-wire';
import { reachXAIVideo } from './provider/xai-video';
import { firstDeclaredTarget } from './routing/route-table';

function videoError(message: string, status: 400 | 404 = 400): Response {
  return Response.json({ error: { type: 'invalid_request_error', message } }, { status });
}

type XAIGrant = Extract<SpendGrant, { verdict: 'resolved' }> & {
  spend: { custody: 'credentialed'; provider: 'xai'; credential: string };
};

function xaiGrant(grant: SpendGrant): grant is XAIGrant {
  return (
    grant.verdict === 'resolved' &&
    grant.spend.custody === 'credentialed' &&
    grant.spend.provider === 'xai'
  );
}

function idempotencyKey(c: Context): string | undefined {
  const value = c.req.header('x-idempotency-key');

  return value === undefined || value.trim() === '' ? undefined : value.trim();
}

function providerBody(body: JsonObject, providerModel: string): JsonObject {
  return { ...body, model: providerModel };
}

async function videoAnswerForTarget(
  c: Context,
  gateway: EngineGateway,
  path: XAIVideoPath,
  spendGrantFor: SpendGrantFor,
  made: { body: JsonObject; virtual: EngineVirtualModel; declared: BoundTarget },
  fetchLike: typeof fetch,
): Promise<Response> {
  const grant = await spendGrantFor(gateway.slug, made.virtual.id, made.declared.routeNode);

  if (!xaiGrant(grant)) {
    return videoError('The video target has no xAI credential.');
  }

  return reachXAIVideo(
    grant.providerOrigin,
    path,
    grant.spend.credential,
    providerBody(made.body, made.declared.standing.providerModel),
    idempotencyKey(c),
    fetchLike,
  );
}

export async function proxyVideoRequest(
  c: Context,
  gateway: EngineGateway,
  path: XAIVideoPath,
  spendGrantFor: SpendGrantFor,
  fetchLike: typeof fetch,
): Promise<Response> {
  const body = await readJsonBody(c);
  const model = typeof body['model'] === 'string' ? body['model'] : '';
  const virtual = gateway.virtualModels.find((candidate) => candidate.id === model);

  if (virtual === undefined) return videoError(`The model "${model}" does not exist.`, 404);

  const declared = firstDeclaredTarget(virtual.routing);

  if (declared?.standing.standing !== 'bound') return videoError('The video model has no target.');

  return videoAnswerForTarget(
    c,
    gateway,
    path,
    spendGrantFor,
    { body, virtual, declared: { routeNode: declared.routeNode, standing: declared.standing } },
    fetchLike,
  );
}
