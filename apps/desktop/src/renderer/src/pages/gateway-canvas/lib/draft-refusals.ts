import type { VirtualModel } from '@recompose/contracts';

import { modelAliasSchema } from '@recompose/contracts';

import { IpcResultError, refusalSentence } from '../../../shared/api';

const MALFORMED_DEFINITION_REFUSAL =
  "recompose can't store this virtual model. Check the name and the id, then try again.";
const MISSING_NAME_REFUSAL = 'Give the virtual model a name.';
const UNSERVABLE_ID_REFUSAL =
  "recompose can't serve a virtual model under this id. Pick another one.";

/**
 * The sentence a refused save reads as, in words about the virtual model a person was defining.
 *
 * @summary A schema refusal trades its words, because the schema writes for a developer and names
 * a path inside a document nobody typed. Everything else travels as main wrote it: a gateway the
 * rewrite could not find and a port the move lane owns are both already sentences a person can act
 * on, and rewriting them here would only put this module's guess in front of main's fact.
 */
export function refusalFromMain(failure: unknown): string {
  if (!(failure instanceof IpcResultError)) {
    return refusalSentence(failure);
  }

  return failure.code === 'validation-failed' ? MALFORMED_DEFINITION_REFUSAL : failure.message;
}

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
