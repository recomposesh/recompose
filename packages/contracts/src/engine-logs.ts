import { z } from 'zod';

import { gatewaySlugSchema, modelAliasSchema } from './gateway-config';
import { nonBlankString } from './non-blank';

const loggedAtSchema = z.number().int().nonnegative();

const loggedStatusSchema = z.number().int().min(100).max(599);

const loggedDurationSchema = z.number().nonnegative();

const loggedTokensSchema = z.number().int().nonnegative();

const clientKeySchema = z.string().regex(/^sha256:[0-9a-f]{64}$/, 'must be a sha256 digest');

/**
 * The five-way token reading a provider answer carried, beside the total the row already keeps.
 *
 * @summary The engine parses this split per dialect the moment an answer lands, and the row is
 * where it survives the trip to every reader: the ledger prices cached input apart from uncached,
 * and the usage screen prints the cached share. A row without a split read totals only, which is
 * how every row before this field reads.
 */
export const tokenSplitSchema = z.strictObject({
  input: loggedTokensSchema,
  output: loggedTokensSchema,
  cacheRead: loggedTokensSchema,
  cacheWrite: loggedTokensSchema,
  reasoning: loggedTokensSchema,
});

export type TokenSplit = z.infer<typeof tokenSplitSchema>;

const FIRST_FAILING_STATUS = 400;

/**
 * How much of a provider's own explanation a row may quote, which is what a cable quotes.
 *
 * @summary The bound is the contract's rather than the engine's, because the engine is what has a
 * whole body in hand at the moment it takes the quote. Naming the span here and slicing to it there
 * is what keeps the two from drifting into a row a reader would have to trust.
 */
export const PROVIDER_MESSAGE_SPAN = 280;

const OPENS_A_BODY = /^[[{]/;

const CARRIES_A_STREAM_FRAME = /(?:^|\n)\s*(?:data|event):/;

/**
 * Whether a quote is a provider explaining itself rather than a provider's answer smuggled whole.
 *
 * @summary A message is prose and a body is structure, so the two are told apart by shape rather
 * than by trusting whoever wrote the field. Text opening a brace or a bracket is the JSON a
 * refusal arrives in, and text carrying a `data:` or `event:` line is the stream one arrives on.
 * Refusing both here is what makes the privacy rule a thing the contract holds rather than a thing a
 * reviewer has to notice: a caller that skipped the extraction and handed the whole body over is
 * refused at the boundary rather than listed in the drawer.
 */
function readsAsAMessage(quoted: string): boolean {
  return !OPENS_A_BODY.test(quoted) && !CARRIES_A_STREAM_FRAME.test(quoted);
}

const providerMessageSchema = nonBlankString
  .max(PROVIDER_MESSAGE_SPAN, 'must be a message rather than a body')
  .refine(readsAsAMessage, 'must be a message rather than a body');

/**
 * The provider's own words, cut and admitted to exactly what a row is allowed to carry.
 *
 * @summary Whoever takes a quote asks here rather than deciding for itself, because a quote the
 * schema would refuse costs the whole row: an engine that attached one would have its report
 * refused at the child's edge and a person would lose the very failure they were trying to read.
 * Answering with nothing is the safe reading, since a row without a quote still names its cause.
 */
export function providerMessageOf(spoken: string): string | undefined {
  const quoted = spoken.trim().slice(0, PROVIDER_MESSAGE_SPAN).trim();

  return quoted !== '' && readsAsAMessage(quoted) ? quoted : undefined;
}

/**
 * One child a failed request reached for, and why that child could not take it.
 *
 * @summary The reason is the very sentence the caller's own refusal prints for this child, so a
 * person comparing the answer their client holds against the row the drawer lists reads one wording
 * rather than two. It names the provider model rather than the route node, because a minted node id
 * says nothing to anyone and the model is what a person recognizes on the canvas.
 */
export const attemptedChildSchema = z.strictObject({
  child: nonBlankString,
  why: nonBlankString,
});

export type AttemptedChild = z.infer<typeof attemptedChildSchema>;

function namesSomething(diagnosis: {
  router?: string | undefined;
  tried?: readonly AttemptedChild[] | undefined;
  upstreamMessage?: string | undefined;
}): boolean {
  return (
    diagnosis.router !== undefined ||
    (diagnosis.tried?.length ?? 0) > 0 ||
    diagnosis.upstreamMessage !== undefined
  );
}

/**
 * The gateway's own reading of why one request failed, as the drawer's detail panel prints it.
 *
 * @summary It carries readings and never material: which router stood in the way, which children it
 * reached and what each one did, and the sentence a provider sent explaining its own refusal. What a
 * person asked and what a model answered stay out, and the schema is where that holds: a body handed
 * to `upstreamMessage` is refused rather than listed. A diagnosis naming nothing at all is refused
 * too, so an empty reading can never pose as a reading that was taken.
 */
export const failureDiagnosisSchema = z
  .strictObject({
    router: nonBlankString.optional(),
    tried: z.array(attemptedChildSchema).readonly().optional(),
    upstreamMessage: providerMessageSchema.optional(),
  })
  .refine(namesSomething, 'a diagnosis must name something');

export type FailureDiagnosis = z.infer<typeof failureDiagnosisSchema>;

function diagnosesOnlyAFailure(row: {
  status: number;
  diagnosis?: FailureDiagnosis | undefined;
}): boolean {
  return row.diagnosis === undefined || row.status >= FIRST_FAILING_STATUS;
}

/**
 * One request a gateway answered, as the drawer lists it and the footer counts it.
 *
 * @summary No prompt, no completion, and no request or response body of any kind ever rides a row.
 * `failure` carries a sentence the gateway wrote itself: where the gateway refused the request, the
 * very sentence the caller was handed, so a row and the answer a client holds can never disagree
 * about why; where a target failed, the reading that status earns. `diagnosis` carries the rest of
 * what the gateway read, and it is the one place a provider's own words ride a row: the message a
 * provider sent explaining its refusal, never the answer it sent around that message. Only a failed
 * row carries one, because a request that was served has nothing to explain.
 *
 * `clientKey` carries the `sha256:` digest form the gateway writes at its edge and nothing else, so
 * an address cannot ride the field even by mistake, and the renderer counts distinct callers apart
 * without ever reading one. The count it feeds reads as client apps: the distinct client apps seen in
 * the last minute. A row the gateway raised before any provider answered reads `origin: 'gateway'`
 * and leaves its provider cells empty, so the footer's errors and a red cable can never disagree.
 * `virtualModel` reads the alias vocabulary rather than the gateway's, because an alias keeps the
 * dots a real model name carries and a row through `claude-5.6-sol` has to name it.
 */
export const logRowSchema = z
  .strictObject({
    id: nonBlankString,
    at: loggedAtSchema,
    gateway: gatewaySlugSchema,
    virtualModel: modelAliasSchema.optional(),
    origin: z.enum(['provider', 'gateway']),
    method: nonBlankString,
    provider: nonBlankString.optional(),
    accountId: nonBlankString.optional(),
    providerModel: nonBlankString.optional(),
    status: loggedStatusSchema,
    durationMs: loggedDurationSchema.optional(),
    tokens: loggedTokensSchema.optional(),
    usage: tokenSplitSchema.optional(),
    clientKey: clientKeySchema,
    failure: nonBlankString.optional(),
    diagnosis: failureDiagnosisSchema.optional(),
  })
  .refine(diagnosesOnlyAFailure, 'only a failed request carries a diagnosis');

export type LogRow = z.infer<typeof logRowSchema>;

/**
 * A run of rows crossing to the renderer at once, either the backfill on subscribe or an append.
 *
 * @summary A fresh subscriber reads what it missed as bounded backfill chunks whose union is the
 * engine buffer at that moment, and every flush after that appends. Both kinds merge into the
 * renderer cache by row id rather than replacing it, because the engine buffer drains behind the
 * drawer's back and a replace would take rows a person is reading. The rows arrive frozen, so no
 * reader reshapes a run another reader holds.
 */
export const logBatchSchema = z.strictObject({
  kind: z.enum(['backfill', 'append']),
  rows: z.array(logRowSchema).readonly(),
});

export type LogBatch = z.infer<typeof logBatchSchema>;
