import type { CoverageOptions } from 'vitest/node';

/**
 * The thresholds, unless this run is one leg of a battery split across machines.
 *
 * @summary A shard measures the files it happened to run and nothing else, so its own percentage is
 * a fraction of the whole by construction and would refuse every time. `--mergeReports` rebuilds
 * one report from every blob, and that reading is the one the gate judges. The numbers below never
 * move: only which run applies them does.
 */
const thresholdsUnlessOneLeg =
  process.env['RECOMPOSE_TEST_SHARD'] === undefined
    ? { thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 } }
    : {};

export const coverageDefaults: CoverageOptions = {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  ...thresholdsUnlessOneLeg,
};
