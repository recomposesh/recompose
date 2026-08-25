/** What a setup step counts, named so the control that continues can say it aloud. */
export type PickedThing = 'harness' | 'source';

const PLURAL: Record<PickedThing, string> = {
  harness: 'harnesses',
  source: 'sources',
};

/**
 * What the control that continues a step reads as.
 *
 * @summary A step that has nothing yet says only what it does, because a count of zero beside a
 * control a person cannot take reads as a fault rather than as a step still waiting on them.
 */
export function continueReads(picked: number, thing: PickedThing): string {
  if (picked === 0) {
    return 'Continue';
  }

  return `Continue with ${String(picked)} ${picked === 1 ? thing : PLURAL[thing]}`;
}

/** The picked set a press leaves behind, which is a new set rather than the one handed in. */
export function togglePicked(picked: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(picked);

  if (!next.delete(id)) {
    next.add(id);
  }

  return next;
}
