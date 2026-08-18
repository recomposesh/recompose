import type {
  EngineGateway,
  EngineRouteNode,
  EngineRouting,
  EngineVirtualModel,
} from '@recompose/contracts';
import type { Context } from 'hono';

import type { Crossing, ProxyDialect } from './gateway-wire';

import { responsesToolRefs } from './dialect/responses-extended-tools';
import { requestHeaderMap, requestQueryMap } from './gateway-request-metadata';
import {
  requestCallerFingerprint,
  requestSessions,
  requestsResponsesLite,
} from './gateway-session';
import { ingressPayload, readJsonBody, refusalResponse, virtualNameOf } from './gateway-wire';
import { servingTurnWalks } from './provider/serving-turn';
import { missingTarget, unknownModel } from './refusals';
import { entryNodeOf } from './router-entry';
import { firstDeclaredTarget } from './routing/route-table';

type CrossingLookup =
  | { crossing: Crossing; virtualModel: EngineVirtualModel }
  | { response: Response };

/**
 * The provider model a request opens with, before the walk names the child that will serve it.
 *
 * @summary Every attempt overwrites this with the model its own child was bound to, so what stands
 * here matters only where no attempt is ever made: a plugin reading the request before the walk, and
 * a refusal raised before any child was tried. Both want a name rather than a blank, so a table that
 * declares no bound child answers the virtual model's own name, which is the name the caller used.
 */
function providerModelTheTableOpensWith(routing: EngineRouting, model: string): string {
  const declared = firstDeclaredTarget(routing);

  return declared?.standing.standing === 'bound' ? declared.standing.providerModel : model;
}

function standsRemoved(entry: EngineRouteNode): boolean {
  return entry.kind === 'target' && entry.standing.standing === 'removed';
}

/**
 * The refusal a table earns before any child is tried, or nothing where the walk may begin.
 *
 * @summary A lone target whose account left refuses for the binding a person can see is broken,
 * before any walk begins, because no walk could cure it. Nothing about a chained turn is decided
 * here, because routers chain and the router that would spread a turn is the one the walk reaches
 * rather than the one the table opens with.
 */
function refusalTheEntryEarns(
  dialect: ProxyDialect,
  gateway: EngineGateway,
  model: string,
  routing: EngineRouting,
): Response | undefined {
  const entry = entryNodeOf(routing);

  return entry === undefined || standsRemoved(entry)
    ? refusalResponse(dialect, missingTarget(gateway.displayName, model))
    : undefined;
}

function crossingBody(
  body: Record<string, unknown>,
  modelOverride: string | undefined,
  streamOverride: boolean | undefined,
): Record<string, unknown> {
  return {
    ...body,
    ...(modelOverride === undefined ? {} : { model: modelOverride }),
    ...(streamOverride === true ? { stream: true } : {}),
  };
}

export async function gatewayRequestCrossing(
  c: Context,
  dialect: ProxyDialect,
  gateway: EngineGateway,
  modelOverride?: string,
  streamOverride?: boolean,
): Promise<CrossingLookup> {
  const body = await readJsonBody(c);
  const raw = crossingBody(body, modelOverride, streamOverride);
  const name = modelOverride ?? virtualNameOf(raw, dialect);
  const virtualModel = gateway.virtualModels.find((candidate) => candidate.id === name);

  if (virtualModel === undefined) {
    return { response: refusalResponse(dialect, unknownModel(name)) };
  }

  servingTurnWalks(virtualModel.id);

  const refusal = refusalTheEntryEarns(dialect, gateway, name, virtualModel.routing);

  if (refusal !== undefined) {
    return { response: refusal };
  }

  return {
    virtualModel,
    crossing: {
      dialect,
      raw,
      gatewayName: gateway.displayName,
      virtualModel: virtualModel.id,
      providerModel: providerModelTheTableOpensWith(virtualModel.routing, virtualModel.id),
      ...requestSessions(c, raw),
      callerFingerprint: requestCallerFingerprint(c),
      responsesLite: requestsResponsesLite(c),
      anthropicBeta: c.req.header('anthropic-beta'),
      requestHeaders: requestHeaderMap(c),
      requestQuery: requestQueryMap(c),
      ...responsesRefs(dialect, raw),
    },
  };
}

function responsesRefs(
  dialect: ProxyDialect,
  raw: Record<string, unknown>,
): Pick<Crossing, 'responsesToolRefs'> | object {
  if (dialect !== 'responses') return {};

  const request = ingressPayload('responses', raw);

  return request === null ? {} : { responsesToolRefs: responsesToolRefs(request) };
}
