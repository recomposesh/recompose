import type { LookCustody } from '@recompose/contracts';

import type { CopilotWire } from './copilot-wire';

import { isJsonObject } from '../gateway-wire';
import { copilotWireFor } from './copilot-wire';
import { lookHeadersFor, modelsPathFor } from './look-request';

type SubscriptionLook = Extract<LookCustody, { custody: 'subscription' }>;

type CatalogRead = { readAtMs: number; endpoints: Map<string, readonly unknown[]> | null };

export type CopilotCatalog = Map<string, CatalogRead>;

export type CopilotCatalogDeps = {
  fetchLike: typeof fetch;
  now: () => number;
  catalog: CopilotCatalog;
};

const CATALOG_WINDOW_MS = 10 * 60 * 1000;

const CATALOG_BOUND_MS = 5000;

export function copilotCatalog(): CopilotCatalog {
  return new Map();
}

/**
 * The wire one Copilot turn is reached on, read from that account's own catalog.
 *
 * @summary Copilot answers each model on the endpoints it names and refuses the rest with
 * `model_not_supported`, so the reach has to follow the catalog rather than one fixed path. The
 * read is held for a window because a catalog answers the same for every turn inside it, and a
 * read that fails leaves the completions reach standing rather than moving a turn on a guess.
 */
export async function copilotWireOf(
  deps: CopilotCatalogDeps,
  custody: SubscriptionLook,
  origin: string,
  model: string,
): Promise<CopilotWire> {
  const endpoints = await endpointsFor(deps, custody, origin);

  return copilotWireFor(endpoints.get(model) ?? []);
}

/**
 * @summary A read the vendor refused is remembered as a failure rather than as an empty catalog,
 * because holding "this account names no endpoints" for the window would put every Responses-only
 * model out of reach until it expired.
 */
async function endpointsFor(
  deps: CopilotCatalogDeps,
  custody: SubscriptionLook,
  origin: string,
): Promise<Map<string, readonly unknown[]>> {
  const held = deps.catalog.get(custody.accountId);
  const nowMs = deps.now();

  if (held?.endpoints != null && nowMs - held.readAtMs < CATALOG_WINDOW_MS) return held.endpoints;

  const endpoints = await readCatalog(deps.fetchLike, custody, origin);

  deps.catalog.set(custody.accountId, { readAtMs: nowMs, endpoints });

  return endpoints ?? new Map();
}

async function readCatalog(
  fetchLike: typeof fetch,
  custody: SubscriptionLook,
  origin: string,
): Promise<Map<string, readonly unknown[]> | null> {
  const body = await catalogBody(fetchLike, custody, origin);

  if (body === undefined) return null;

  const entries = isJsonObject(body) && Array.isArray(body['data']) ? body['data'] : [];

  return new Map(entries.map(endpointRow).filter((row) => row !== null));
}

function endpointRow(entry: unknown): [string, readonly unknown[]] | null {
  if (!isJsonObject(entry) || typeof entry['id'] !== 'string') return null;

  const endpoints = entry['supported_endpoints'];

  return [entry['id'], Array.isArray(endpoints) ? endpoints : []];
}

async function catalogBody(
  fetchLike: typeof fetch,
  custody: SubscriptionLook,
  origin: string,
): Promise<unknown> {
  try {
    const answer = await fetchLike(`${origin.replace(/\/+$/u, '')}${modelsPathFor(custody)}`, {
      method: 'GET',
      headers: lookHeadersFor(custody),
      redirect: 'error',
      signal: AbortSignal.timeout(CATALOG_BOUND_MS),
    });

    return answer.ok ? await answer.json() : undefined;
  } catch {
    console.error(`the Copilot catalog at ${origin} could not be read, so completions stands.`);

    return undefined;
  }
}
