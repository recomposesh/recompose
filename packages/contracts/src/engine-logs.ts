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

/**
 * One request a gateway answered, as the drawer lists it and the footer counts it.
 *
 * @summary No prompt, no completion, and no body of any kind ever rides a row. A failure carries
 * `failure` alone, a sentence written from the status and nothing else, which extends the rule
 * `requestOutcomeSchema` already states to every row here. `clientKey` carries the `sha256:` digest
 * form the gateway writes at its edge and nothing else, so an address cannot ride the field even by
 * mistake, and the renderer counts distinct callers apart without ever reading one. The count it
 * feeds reads as client apps: the distinct client apps seen in the last minute. A row
 * the gateway raised before any provider answered reads `origin: 'gateway'` and leaves its
 * provider cells empty, so the footer's errors and a red cable can never disagree. `virtualModel`
 * reads the alias vocabulary rather than the gateway's, because an alias keeps the dots a real
 * model name carries and a row through `claude-5.6-sol` has to name it.
 */
export const logRowSchema = z.strictObject({
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
});

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
