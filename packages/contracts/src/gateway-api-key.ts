import { z } from 'zod';

import { nonBlankString } from './non-blank';

export const GATEWAY_API_KEY_PREFIX = 'rc-local-';

const KEY_BYTES = 32;

const HIDDEN_RUN = '••••••••';

const SHOWN_TAIL = 4;

/**
 * The key a gateway hands its callers, beside the answer to whether it requires one.
 *
 * @summary The two facts travel together so no stored gateway can name a requirement it holds no key
 * for. An absent field means a gateway that never minted one, and `required: false` means a stored key
 * the gateway leaves unenforced, which is what keeps a key the clients already carry. The value takes
 * any non-blank string rather than the minted shape, so a document a person edited by hand reads back
 * instead of going to quarantine.
 */
export const gatewayApiKeySchema = z.strictObject({
  value: nonBlankString,
  required: z.boolean(),
});

export type GatewayApiKey = z.infer<typeof gatewayApiKeySchema>;

function inBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

/**
 * A fresh key for one gateway.
 *
 * @summary Thirty-two bytes from the platform random source, spelled as unpadded base64url behind a
 * prefix that names the value on sight. That yields 256 bits in 52 characters, past the 128-bit floor
 * the Open Worldwide Application Security Project recommends. Nobody types this value, so nothing
 * collects one from a person: a credential a person invents is a weak credential.
 */
export function mintGatewayApiKey(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(KEY_BYTES));

  return `${GATEWAY_API_KEY_PREFIX}${inBase64Url(bytes)}`;
}

/**
 * What a screen shows in place of the key.
 *
 * @summary The prefix names the value and the last four characters tell two keys apart, which is every
 * job a screen has here. The tail appears only while at least eight characters stay behind the run of
 * bullets, so a short key a person wrote by hand masks whole rather than leaking most of itself. A key
 * carrying no prefix claims none.
 */
export function maskGatewayApiKey(key: string): string {
  const prefix = key.startsWith(GATEWAY_API_KEY_PREFIX) ? GATEWAY_API_KEY_PREFIX : '';
  const body = key.slice(prefix.length);

  return body.length >= HIDDEN_RUN.length + SHOWN_TAIL
    ? `${prefix}${HIDDEN_RUN}${body.slice(-SHOWN_TAIL)}`
    : `${prefix}${HIDDEN_RUN}`;
}
