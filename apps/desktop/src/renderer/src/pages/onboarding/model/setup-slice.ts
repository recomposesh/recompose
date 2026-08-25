import type { FoundSource } from './found-source';

/**
 * What every step past the sources question reads off the two the person already answered.
 *
 * @summary Both the compose step and the run that builds ask exactly this much, so the shape is
 * named once rather than restated at each. Neither takes the marked list itself, because the list
 * comes from a look that belongs to the step reading it.
 */
export type SetupSlice = {
  /** The harnesses the person picked, which decide the name the model takes. */
  harnesses: ReadonlySet<string>;
  /** Whether a source stands marked. */
  isMarked: (source: FoundSource) => boolean;
};
