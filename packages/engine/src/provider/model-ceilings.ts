import { modelListBoundMs } from '@recompose/contracts';

import { isJsonObject, parsedJson } from '../gateway-wire';

type Ceilings = ReadonlyMap<string, number>;

type CatalogSpelling = {
  /** Where the vendor publishes its catalog, under the origin a turn is already spent at. */
  path: string;
  /** What the answer calls the array of models. */
  listed: string;
  /** What one entry calls the output it will take, wherever the vendor puts it. */
  ceilingOf: (entry: Record<string, unknown>) => unknown;
};

const compatible: CatalogSpelling = {
  path: '/v1/models',
  listed: 'data',
  ceilingOf: (entry) => entry['max_completion_tokens'],
};

/**
 * How each vendor that refuses an oversized ask states the output its models will take.
 *
 * @summary A vendor is here because it was seen to refuse the whole turn over the number rather
 * than clamping it, which is the only case worth a request to learn about: every other vendor
 * clamps quietly and a catalog read for it would spend a request to change nothing. They differ in
 * where the answer keeps the number, which is why the reading is per vendor rather than one shape.
 *
 * OpenRouter reports the serving provider's ceiling rather than the model's own, which is the
 * number that actually bounds a turn, so it is read from there if it is ever added here.
 */
const CATALOG_SPELLINGS: ReadonlyMap<string, CatalogSpelling> = new Map([
  ['groq', compatible],
  ...(['gemini', 'aistudio'] as const).map(
    (vendor) =>
      [
        vendor,
        {
          path: '/v1beta/models',
          listed: 'models',
          ceilingOf: (entry: Record<string, unknown>) => entry['outputTokenLimit'],
        },
      ] as const,
  ),
]);

export function statesItsCeiling(provider: string): boolean {
  return CATALOG_SPELLINGS.has(provider);
}

const known = new Map<string, Promise<Ceilings>>();

export function forgetModelCeilings(): void {
  known.clear();
}

function idIn(entry: Record<string, unknown>): string | null {
  const named = entry['id'] ?? entry['name'];

  return typeof named === 'string' ? named.replace(/^models\//u, '') : null;
}

function statedCeiling(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;

  return value;
}

function ceilingIn(spelling: CatalogSpelling, entry: unknown): readonly [string, number] | null {
  if (!isJsonObject(entry)) return null;

  const id = idIn(entry);
  const ceiling = statedCeiling(spelling.ceilingOf(entry));

  return id === null || ceiling === null ? null : [id, ceiling];
}

function ceilingsIn(spelling: CatalogSpelling, body: unknown): Ceilings {
  const listed = isJsonObject(body) ? body[spelling.listed] : undefined;

  if (!Array.isArray(listed)) return new Map();

  return new Map(
    listed
      .map((entry) => ceilingIn(spelling, entry))
      .filter((held): held is [string, number] => held !== null),
  );
}

async function readCatalog(
  fetchLike: typeof fetch,
  spelling: CatalogSpelling,
  origin: string,
  headers: Record<string, string>,
): Promise<Ceilings> {
  try {
    const answer = await fetchLike(`${origin}${spelling.path}`, {
      method: 'GET',
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(modelListBoundMs),
    });

    return answer.ok ? ceilingsIn(spelling, parsedJson(await answer.text())) : new Map();
  } catch {
    console.error(`recompose could not read the model ceilings at ${origin}.`);

    return new Map();
  }
}

/**
 * The output ceilings one vendor states, read once and kept for the life of the process.
 *
 * @summary A caller writes `max_tokens` for the model it thinks it is talking to, and a virtual
 * model may send that turn to an upstream whose ceiling is far lower. The number is the vendor's
 * own to state, so it is read off the vendor rather than written down here, where it would go
 * stale the week the vendor ships a model.
 *
 * A catalog that could not be read is remembered as read and empty rather than retried per turn,
 * because a vendor that is down would otherwise pay for a second request on every request. Turns
 * arriving together share the one reading, so a burst at startup asks once between them.
 */
export async function modelCeilingsFor(
  fetchLike: typeof fetch,
  provider: string,
  origin: string,
  headers: Record<string, string>,
  accountId: string,
): Promise<Ceilings> {
  const spelling = CATALOG_SPELLINGS.get(provider);

  if (spelling === undefined) return new Map();

  const key = `${provider}:${origin}:${accountId}`;
  const held = known.get(key);

  if (held !== undefined) return held;

  const reading = readCatalog(fetchLike, spelling, origin, headers);

  known.set(key, reading);

  return reading;
}
