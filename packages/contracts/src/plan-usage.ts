import { z } from 'zod';

import { nonBlankString } from './non-blank';

const instantSchema = z.number().int().positive();

/**
 * How much of one plan window a vendor says has already been spent.
 *
 * @summary The share is a fraction of the window rather than a percentage, because two vendors
 * report it two ways and one shape at the boundary is what stops a card from printing a 0.07 as
 * seven hundredths of a percent. It is what the vendor said, not what this machine measured: the
 * one figure on the Usage page that is an official reading rather than a local derivation.
 */
export const planUsageWindowSchema = z.strictObject({
  length: z.enum(['5h', 'week']),
  spentShare: z.number().min(0).max(1),
  resetsAt: instantSchema.optional(),
});

export type PlanUsageWindow = z.infer<typeof planUsageWindowSchema>;

/**
 * What one account's plan windows read at the moment a provider last answered it.
 *
 * @summary A reading rides an answer rather than a poll, so it exists only for an account that has
 * actually been sent through, and only for the vendors that report one at all. `readAt` is what
 * lets a card say how fresh the figure is, since a plan a person stopped sending through keeps its
 * last reading until the window it measured turns over rather than pretending to be current.
 */
export const planUsageReadingSchema = z.strictObject({
  accountId: nonBlankString,
  provider: nonBlankString,
  readAt: instantSchema,
  windows: z.array(planUsageWindowSchema).min(1).readonly(),
});

export type PlanUsageReading = z.infer<typeof planUsageReadingSchema>;

/** Every account's latest plan reading, keyed by the account it belongs to. */
export const planUsageReadingsSchema = z.record(nonBlankString, planUsageReadingSchema);

export type PlanUsageReadings = z.infer<typeof planUsageReadingsSchema>;
