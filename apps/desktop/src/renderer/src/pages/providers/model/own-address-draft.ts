import type { ProviderDialect } from '@recompose/contracts';

import { RUNTIME_PORT_RANGE, runtimePortSchema } from '@recompose/contracts';

/**
 * The dialects a person may name, which are the ones the gateway already translates.
 *
 * @summary Gemini and Interactions stay off the list. Both reach one vendor's own surface through
 * a credential shaped for it, so neither describes an endpoint a person would stand up themselves.
 */
export const namedDialects: readonly { value: ProviderDialect; label: string }[] = [
  { value: 'chat-completions', label: 'OpenAI Chat Completions' },
  { value: 'anthropic', label: 'Anthropic Messages' },
  { value: 'responses', label: 'OpenAI Responses' },
];

export const firstDialect: ProviderDialect = 'chat-completions';

/** The dialect a picker's value stands for, falling back rather than trusting an unknown word. */
export function dialectNamed(value: string): ProviderDialect {
  return namedDialects.find((named) => named.value === value)?.value ?? firstDialect;
}

const PORT_RANGE_REFUSAL = `Accepts ${String(RUNTIME_PORT_RANGE.min)} through ${String(RUNTIME_PORT_RANGE.max)}.`;

/**
 * What a typed address is refused for, or nothing while it still stands.
 *
 * @summary An empty field refuses nothing, because a person who has yet to type is not wrong yet.
 * Anything a request could not be sent to refuses, so the refusal lands before a secret is stored
 * against an address nothing can reach.
 */
export function addressRefusal(typed: string): string | undefined {
  const trimmed = typed.trim();

  if (trimmed === '') {
    return undefined;
  }

  return URL.canParse(trimmed) ? undefined : 'Enter a full address, starting with https://.';
}

/** What a typed port is refused for, or nothing while it still stands. */
export function portRefusal(typed: string): string | undefined {
  return runtimePortSchema.safeParse(Number(typed)).success ? undefined : PORT_RANGE_REFUSAL;
}

/**
 * The provider identity a row a person named is stored under.
 *
 * @summary Nothing documents this endpoint, so the identity comes from the name they gave it,
 * folded to the shape a stored provider takes. It exists so two rows a person named differently
 * never collide under one identity.
 */
export function providerIdFromName(name: string): string {
  const folded = name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/gu, '-')
    .replace(/^-+|-+$/gu, '');

  return folded === '' ? 'custom' : folded;
}
