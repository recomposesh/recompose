import { isJsonObject } from '../gateway-wire';

/**
 * The small readings every stored credential is measured with.
 *
 * @summary A JSON document, a JWT claim, a finite number and a date string are what every
 * vendor's credential is read through, whatever shape the vendor wrote around them, so they
 * stand apart from any one vendor's arm rather than being reached for across it.
 */
export type JsonObject = Record<string, unknown>;

export function objectOf(value: unknown): JsonObject | null {
  return isJsonObject(value) ? value : null;
}

export function jwtClaims(token: string): JsonObject | null {
  const encoded = token.split('.')[1];

  if (encoded === undefined) return null;

  try {
    return objectOf(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
  } catch {
    return null;
  }
}

export function jwtExpiry(token: string): number | undefined {
  const expiry = finiteNumber(jwtClaims(token)?.['exp']);

  return expiry === undefined ? undefined : expiry * 1000;
}

export function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function parsedDate(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}
