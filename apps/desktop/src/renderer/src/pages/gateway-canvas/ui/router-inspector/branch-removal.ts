/** The question a branch removal stands on, and the cost it names before it applies. */
export type BranchRemovalQuestion = { heading: string; body: string; confirmLabel: string };

const WHAT_IT_COSTS =
  'Requests that matched this rule fall to else from the next one on. Conversations already pinned to it move too.';

/**
 * What a person is asked before a branch and the child behind it leave the router.
 *
 * @summary The cost is the routing, not the row: deleting a branch is a decision about where its
 * traffic goes next, and a person who reads only "this cannot be undone" learns nothing they can
 * weigh. A branch nobody has labelled yet is asked about in the same words minus the label, since
 * the label is the one part that might not exist.
 */
export function branchRemovalQuestion(label: string | undefined): BranchRemovalQuestion {
  const named = label?.trim() ?? '';

  return {
    heading: named === '' ? 'Delete this branch?' : `Delete the ${named} branch?`,
    body: WHAT_IT_COSTS,
    confirmLabel: 'Delete branch',
  };
}
