/** What became of a binding, which is the whole of what the canvas has to say out loud. */
export type BindingOutcome =
  | { kind: 'bound'; virtualModel: string; target: string }
  | { kind: 'rebound'; virtualModel: string; target: string }
  | { kind: 'released'; virtualModel: string }
  | { kind: 'repaired'; virtualModel: string; target: string }
  | { kind: 'refused'; refusal: string };

type TiedOutcome = Extract<BindingOutcome, { kind: 'bound' | 'rebound' | 'repaired' }>;

function tiedSentence(outcome: TiedOutcome): string {
  if (outcome.kind === 'repaired') {
    return `Repaired the virtual model "${outcome.virtualModel}", which is bound to "${outcome.target}" again.`;
  }

  const verb = outcome.kind === 'bound' ? 'Bound' : 'Rebound';

  return `${verb} the virtual model "${outcome.virtualModel}" to "${outcome.target}".`;
}

/**
 * The one sentence the live region says about what just became of a binding.
 *
 * @summary Every gesture that binds, rebinds, unbinds, or repairs lands here, so a person who
 * cannot see the cable move hears the same fact a sighted person reads off the canvas. Each
 * sentence leads with what happened and then names both ends of the binding, and a refusal carries
 * the refusing words rather than a summary of them.
 */
export function announcedOutcome(outcome: BindingOutcome): string {
  if (outcome.kind === 'refused') {
    return `Refused the binding. ${outcome.refusal}`;
  }

  if (outcome.kind === 'released') {
    return `Unbound the virtual model "${outcome.virtualModel}", which now holds no target.`;
  }

  return tiedSentence(outcome);
}

/**
 * How loudly the live region carries an outcome, which is politely unless it refused.
 *
 * @summary An outcome a person asked for waits for whatever the reader is already saying, because
 * interrupting every routine bind is the queue flooding that makes people turn a region off. A
 * refusal interrupts, since the person is mid-gesture and it changes what letting go will do.
 */
export function announcedUrgency(outcome: BindingOutcome): 'assertive' | 'polite' {
  return outcome.kind === 'refused' ? 'assertive' : 'polite';
}
