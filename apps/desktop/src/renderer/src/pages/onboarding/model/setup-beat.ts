import type { SetupStep } from './setup-step';

/** The beats setup counts, which are the turns it waits on a person for. */
export const SETUP_BEATS = ['harnesses', 'sources', 'compose', 'point', 'first request'] as const;

export type SetupBeat = (typeof SETUP_BEATS)[number];

const BEAT_OF: Record<SetupStep, SetupBeat | null> = {
  welcome: null,
  harnesses: 'harnesses',
  sources: 'sources',
  compose: 'compose',
  building: 'compose',
  pointing: 'point',
  waiting: 'first request',
};

/**
 * The beat a step stands on, or nothing where the step counts as no beat of its own.
 *
 * @summary The count is of turns a person takes, not of screens they see. Composing and building
 * are one turn: a person answers on the first and watches the second, so a second dot there would
 * report progress they never made. The welcome step asks nothing at all, which is why it carries
 * no dots.
 */
export function beatOf(step: SetupStep): SetupBeat | null {
  return BEAT_OF[step];
}
