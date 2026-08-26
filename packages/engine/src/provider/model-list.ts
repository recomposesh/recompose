import {
  modelListBoundMs,
  nonBlankString,
  type ListedModel,
  type LookCustody,
  type ModelListing,
  type SubscriptionProviderId,
} from '@recompose/contracts';

import { isJsonObject, parsedJson } from '../gateway-wire';
import { antigravitySubscriptionModels } from '../subscription/antigravity-models';
import { claudeSubscriptionModels } from '../subscription/claude-models';
import { kimiSubscriptionModels } from '../subscription/kimi-models';
import { lookHeadersFor, modelsPathFor, namesModelsThatAnswerNoTurn } from './look-request';

const nothingListed: ModelListing = { standing: 'unlisted' };

const codexFreeModels = [
  'gpt-5.4-mini',
  'gpt-5.5',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'codex-auto-review',
] as const;

const codexPaidModels = [
  'gpt-5.3-codex-spark',
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.5',
  'gpt-5.6-sol',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'codex-auto-review',
] as const;

function codexPlanIn(blob: string): string | null {
  const document = parsedJson(blob);

  if (!isJsonObject(document) || !isJsonObject(document['tokens'])) {
    return null;
  }

  const token = document['tokens']['id_token'];

  return typeof token === 'string' ? planInToken(token) : null;
}

function planInToken(token: string): string | null {
  const encoded = token.split('.')[1];

  if (encoded === undefined) {
    return null;
  }

  const claims = parsedJson(Buffer.from(encoded, 'base64url').toString('utf8'));

  if (!isJsonObject(claims) || !isJsonObject(claims['https://api.openai.com/auth'])) {
    return null;
  }

  const plan = claims['https://api.openai.com/auth']['chatgpt_plan_type'];

  return typeof plan === 'string' ? plan : null;
}

/**
 * The models a subscription serves that recompose already knows without asking, or nothing.
 *
 * @summary Three providers publish no list a caller can read, so recompose carries theirs: two are
 * fixed and Codex's depends on the plan its own credential declares. Every other subscription is
 * left to answer for itself over the wire. It has to be named rather than defaulted, because a
 * provider falling through to another's list would offer models it cannot serve under a name a
 * person picked on purpose, and the request would only fail once a client sent it.
 */
const carriedSubscriptionModels = new Map<SubscriptionProviderId, readonly string[]>([
  ['anthropic', claudeSubscriptionModels],
  ['antigravity', antigravitySubscriptionModels],
  ['kimi', kimiSubscriptionModels],
]);

function knownSubscriptionListing(
  custody: Extract<LookCustody, { custody: 'subscription' }>,
): ModelListing | null {
  const carried = carriedSubscriptionModels.get(custody.provider);

  if (carried !== undefined) {
    return { standing: 'listed', models: carried.map((id) => ({ id })) };
  }

  if (custody.provider !== 'openai') {
    return null;
  }

  const served = codexPlanIn(custody.credential) === 'free' ? codexFreeModels : codexPaidModels;

  return { standing: 'listed', models: served.map((id) => ({ id })) };
}

async function answerOrSilence(
  fetchLike: typeof fetch,
  origin: string,
  custody: LookCustody,
): Promise<Response | null> {
  try {
    return await fetchLike(`${origin}${modelsPathFor(custody)}`, {
      method: 'GET',
      headers: lookHeadersFor(custody),
      redirect: 'error',
      signal: AbortSignal.timeout(modelListBoundMs),
    });
  } catch {
    console.error(`The model-list look could not reach ${origin}, so no ids stand.`);

    return null;
  }
}

async function bodyOrNothing(response: Response): Promise<unknown> {
  return response.json().catch(() => undefined);
}

function idOf(entry: unknown): string | null {
  if (!isJsonObject(entry)) {
    return null;
  }

  const named = entry['id'] ?? entry['name'];
  const id = nonBlankString.safeParse(named);

  return id.success ? id.data.replace(/^models\//u, '') : null;
}

function catalogEntriesIn(body: unknown): unknown[] | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const entries = entriesValue(body);

  return Array.isArray(entries) ? entries : null;
}

function entriesValue(body: object): unknown {
  if ('data' in body) {
    return body.data;
  }

  return 'models' in body ? body.models : null;
}

/**
 * @summary A catalog spelling a shutdown date in anything but a date keeps the model rather than
 * reading that value as an announcement, because a live model dropped from the offer reads far
 * worse than a retiring one left on it.
 */
function shutdownDateOf(entry: unknown): string | undefined {
  if (!isJsonObject(entry)) {
    return undefined;
  }

  const announced = nonBlankString.safeParse(entry['shutdown_date']);

  return announced.success ? announced.data : undefined;
}

function listedModelOf(entry: unknown): ListedModel | null {
  const id = idOf(entry);

  if (id === null) {
    return null;
  }

  const shutdownDate = shutdownDateOf(entry);

  return shutdownDate === undefined ? { id } : { id, shutdownDate };
}

function listedModelsIn(body: unknown, chatOnly: boolean): ListedModel[] | null {
  const entries = catalogEntriesIn(body);

  if (entries === null) {
    return null;
  }

  const models = entries.map(listedModelOf);

  if (!models.every((model): model is ListedModel => model !== null)) return null;

  return chatOnly ? models.filter((_model, at) => holdsAConversation(entries[at])) : models;
}

/**
 * @summary A catalog stating nothing of what an entry answers keeps it, because silence is not a
 * refusal, and only the two kinds seen to refuse a turn are read as refusing one.
 */
function holdsAConversation(entry: unknown): boolean {
  if (!isJsonObject(entry) || !isJsonObject(entry['capabilities'])) return true;

  const kind = entry['capabilities']['type'];

  return kind !== 'embeddings' && kind !== 'completion';
}

/**
 * The models one account serves, read from the vendor's OpenAI-compatible catalog.
 *
 * @summary Every way of learning nothing folds to one standing: an origin that answered nothing, a
 * vendor that turned the credential away, a body that is not the catalog it claimed to be. The
 * screen owns the sentence a person reads, so nothing here invents words for silence. A partial
 * catalog folds too, because a list quietly missing a model would let a person bind nothing to it.
 */
function listingCarriedFor(custody: LookCustody): ModelListing | null {
  return custody.custody === 'subscription' ? knownSubscriptionListing(custody) : null;
}

export async function listProviderModels(
  fetchLike: typeof fetch,
  origin: string,
  custody: LookCustody,
): Promise<ModelListing> {
  const carried = listingCarriedFor(custody);

  if (carried !== null) {
    return carried;
  }

  const response = await answerOrSilence(fetchLike, origin, custody);

  if (response === null || !response.ok) {
    return nothingListed;
  }

  const models = listedModelsIn(
    await bodyOrNothing(response),
    namesModelsThatAnswerNoTurn(custody),
  );

  return models === null ? nothingListed : { standing: 'listed', models };
}
