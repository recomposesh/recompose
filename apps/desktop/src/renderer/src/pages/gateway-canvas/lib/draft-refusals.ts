import type { VirtualModel } from '@recompose/contracts';

import { modelAliasSchema } from '@recompose/contracts';

const MISSING_NAME_REFUSAL = 'Give the virtual model a name.';
const UNSERVABLE_ID_REFUSAL =
  "recompose can't serve a virtual model under this id. Pick another one.";
const SKIPPED_ID_HINT = 'Claude Code lists only ids starting with claude or anthropic.';
const DISCOVERED_PREFIXES = ['claude', 'anthropic'];

/** What the name field says back when a name with nothing in it can stand for no model. */
export function nameRefusal(displayName: string): string | undefined {
  return displayName.trim() === '' ? MISSING_NAME_REFUSAL : undefined;
}

/**
 * What the model id field says back when the id a client would send cannot stand as it is.
 *
 * @summary An id no client could send refuses first, then one this gateway already serves, because
 * a second definition under one id would leave two answers to a single request.
 */
export function idRefusal(id: string, held: readonly VirtualModel[]): string | undefined {
  if (!modelAliasSchema.safeParse(id).success) {
    return UNSERVABLE_ID_REFUSAL;
  }

  return held.some((model) => model.id === id)
    ? `This gateway already serves a virtual model named "${id}".`
    : undefined;
}

/**
 * The quiet word about which ids a caller's own picker will surface, where one applies.
 *
 * @summary Claude Code lists only the prefixes it recognizes, so an id outside them serves every
 * client that asks for it by name and appears in that one picker for nobody. The name stays free,
 * because the hint belongs beside the derived id rather than as a rule about what a person may type.
 */
export function discoveryHint(wireId: string): string | undefined {
  return DISCOVERED_PREFIXES.some((prefix) => wireId.startsWith(prefix))
    ? undefined
    : SKIPPED_ID_HINT;
}
