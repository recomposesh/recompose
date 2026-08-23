import type { ParsedSubscriptionCredential } from './credential-shapes';
import type { JsonObject } from './credential-stamps';

import { jwtExpiry, parsedDate } from './credential-stamps';
import { nonBlankCredentialValue } from './credential-values';

/**
 * The credential a Kimi plan hands over, which nests nothing at all.
 *
 * @summary Kimi writes its tokens flat beside the device they were minted for, the shape
 * CLIProxyAPI's `sdk/auth/kimi.go` writes and this app's own sign-in matches. The access token
 * lives fifteen minutes, so an expiry matters more here than anywhere else: it is read from the
 * `expired` stamp an adopted file carries, and from the token's own `exp` claim otherwise, because
 * a sign-in this app ran writes the tokens and nothing else.
 */
function kimiExpiry(document: JsonObject, accessToken: string): number | undefined {
  return parsedDate(document['expired']) ?? jwtExpiry(accessToken);
}

export function kimiCredential(document: JsonObject): ParsedSubscriptionCredential | null {
  const accessToken = nonBlankCredentialValue(document['access_token']);

  if (accessToken === undefined) {
    return null;
  }

  const refreshToken = nonBlankCredentialValue(document['refresh_token']);
  const deviceId = nonBlankCredentialValue(document['device_id']);

  return {
    accessToken,
    ...(refreshToken === undefined ? {} : { refreshToken }),
    ...(deviceId === undefined ? {} : { deviceIds: [deviceId] }),
    ...withKimiExpiry(document, accessToken),
  };
}

function withKimiExpiry(document: JsonObject, accessToken: string): { expiresAt?: number } {
  const expiresAt = kimiExpiry(document, accessToken);

  return expiresAt === undefined ? {} : { expiresAt };
}
