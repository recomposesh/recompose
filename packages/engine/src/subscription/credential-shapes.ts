import type { JsonObject } from './credential-stamps';

/** What one stored credential yields, whatever shape the vendor wrote around it. */
export type ParsedSubscriptionCredential = {
  accessToken: string;
  refreshToken?: string;
  accountId?: string;
  planType?: string;
  accountUuid?: string;
  deviceIds?: string[];
  expiresAt?: number;
  projectId?: string;
  timezone?: string;
  deviceMigrationNeeded?: boolean;
};

/** What one renewal came back with, before it is written into the vendor's own document. */
export type RefreshedTokens = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresInSeconds: number;
};

/**
 * Writes a renewal into a document that nests nothing.
 *
 * @summary Two vendors keep their tokens at the top level beside an RFC 3339 `expired`, so one
 * writer serves both: the shape is a fact about the document rather than about whose it is. A
 * renewal that minted no fresh refresh token keeps the one it was handed, because both vendors
 * accept the old one again and dropping it would strand the account at the next expiry.
 */
export function refreshedFlatDocument(
  document: JsonObject,
  refreshed: RefreshedTokens,
  now: number,
): void {
  document['access_token'] = refreshed.accessToken;
  document['refresh_token'] = refreshed.refreshToken ?? document['refresh_token'];
  document['expired'] = new Date(now + refreshed.expiresInSeconds * 1000).toISOString();
}
