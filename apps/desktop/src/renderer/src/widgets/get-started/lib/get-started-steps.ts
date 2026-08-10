export type GetStartedStep = {
  /** What the step asks the person to do. */
  title: string;
  /** Whether the session finished the step, stands on it, or has not reached it yet. */
  state: 'current' | 'done' | 'pending';
};

export type GetStartedProgress = {
  /** Whether the app holds at least one gateway document. */
  gatewayExists: boolean;
  /** Whether the app holds at least one connected account. */
  providerConnected: boolean;
  /** Whether any gateway holds a virtual model wired to a target. */
  virtualModelComposed: boolean;
  /** Whether a gateway has ever served a request on this profile. */
  firstRequestServed: boolean;
};

/**
 * The four steps of a first session, each carrying where the session stands on it.
 *
 * @summary Every step reads its record from stored documents rather than from a memory of its
 * own, so the checklist can never disagree with what the app holds. The session stands on the
 * first step left undone, and only there.
 */
export function getStartedSteps(progress: GetStartedProgress): readonly GetStartedStep[] {
  const ladder = [
    { title: 'Create a gateway', done: progress.gatewayExists },
    { title: 'Connect a provider', done: progress.providerConnected },
    { title: 'Compose a virtual model', done: progress.virtualModelComposed },
    { title: 'Send the first request', done: progress.firstRequestServed },
  ];
  const standingOn = ladder.findIndex((step) => !step.done);

  return ladder.map(({ title, done }, index) => ({
    title,
    state: done ? 'done' : index === standingOn ? 'current' : 'pending',
  }));
}
