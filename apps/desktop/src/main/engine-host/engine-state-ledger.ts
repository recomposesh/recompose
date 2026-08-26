import type { EngineReport, EngineStates } from '@recompose/contracts';

export function allStopped(slugs: readonly string[]): EngineStates {
  return Object.fromEntries(slugs.map((slug) => [slug, { status: 'stopped' as const }]));
}

export function foldEngineReport(
  states: EngineStates,
  report: Extract<EngineReport, { kind: 'state' }>,
): EngineStates {
  return { ...states, [report.slug]: report.state };
}

/**
 * The ledger with one gateway written down as stopped, for a restart no report ever came back for.
 *
 * @summary Nothing folds here, because there is no report to fold: the engine was told to stop and
 * never confirmed the start that was meant to follow. Stopped is the conservative reading of that
 * silence, and it is the only one a person can act on. A ledger that kept saying running would
 * send every request to a listener that is not there and explain nothing when they are refused.
 *
 * Any port a failed start had named leaves with the word, because a port conflict is a reason a
 * start was refused and a restart that went unanswered gave no reason at all.
 */
export function withGatewayStopped(states: EngineStates, slug: string): EngineStates {
  return { ...states, [slug]: { status: 'stopped' } };
}
