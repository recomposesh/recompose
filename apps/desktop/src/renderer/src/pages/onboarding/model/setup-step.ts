/** The steps setup walks, in the order a person meets them. */
export const SETUP_STEPS = [
  'welcome',
  'harnesses',
  'sources',
  'compose',
  'building',
  'pointing',
  'waiting',
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

const STEP_READS: Record<SetupStep, string> = {
  welcome: 'Welcome to recompose',
  harnesses: 'Which harnesses do you use?',
  sources: 'Where should your models come from?',
  compose: 'Now, your first virtual model',
  building: 'Setting things up',
  pointing: 'Point your harnesses at the gateway',
  waiting: 'Waiting for your first request',
};

/**
 * What a step reads as wherever setup names it rather than draws it.
 *
 * @summary The welcome step draws its brand lockup rather than a heading, so it has no heading a
 * name could point at. Every name lives here instead, which keeps the surface's accessible name
 * answerable for a step whose own drawing says nothing a screen reader can use.
 */
export function setupStepReads(step: SetupStep): string {
  return STEP_READS[step];
}

/** What setup reads a profile off, which is stored documents rather than a memory of its own. */
export type SetupProfile = {
  /** Whether this profile has already finished setup or dismissed it. */
  settled: boolean;
  /** Whether the app holds at least one gateway document. */
  gatewayExists: boolean;
  /** Whether any gateway holds a virtual model wired to a target. */
  virtualModelComposed: boolean;
};

/**
 * The step setup opens on for a profile, or nothing where setup stands away.
 *
 * @summary Reach for it once per opening rather than on every render. A profile that already built
 * a graph has only its first request left to send, so setup meets it at the wait instead of walking
 * it back through work it finished. Recomputing this while setup stands would walk a person
 * backwards the moment they deleted something behind it, which is a change of context they never
 * asked for.
 */
export function setupOpensOn(profile: SetupProfile): SetupStep | null {
  if (profile.settled) {
    return null;
  }

  return profile.gatewayExists && profile.virtualModelComposed ? 'waiting' : 'welcome';
}
