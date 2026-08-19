import type { RouterPolicy } from '@recompose/contracts';

export type ChildCanServe = (child: string) => boolean;

export type ConditionalPolicy = Extract<RouterPolicy, { mode: 'conditional' }>;

export type BranchRule = ConditionalPolicy['branches'][number];

export type BranchChoice = { decided: string; elseChild: string };

export function branchWearingTheLabel(
  branches: readonly BranchRule[],
  label: string | undefined,
): BranchRule | undefined {
  return branches.find((branch) => branch.label === label);
}

/**
 * The child a conditional router hands the request to for one label a judge answered.
 *
 * @summary Every answer that is not one of this router's own labels lands on the else child, so the
 * word else, two labels at once, an empty answer, and a label from another router all read the same
 * here. That is what makes the else child the floor of the mode rather than one more branch: the
 * mapping is total, so no answer a judge could write leaves a request with nowhere to go.
 */
export function childTheLabelNames(
  branches: readonly BranchRule[],
  elseChild: string,
  label: string | undefined,
): string {
  return branchWearingTheLabel(branches, label)?.child ?? elseChild;
}

export type SpunTurn = { child: string | undefined; cursor: number };

/**
 * The child a failover ladder offers next: the earliest one declared that can still serve.
 *
 * @summary Declared order is the whole instruction, so the walk reaches a later child only when
 * every child before it stands down. The ladder holds no state of its own, which is why a request
 * that finds the first child healthy always lands there.
 */
export function nextFailoverChild(
  children: readonly string[],
  canServe: ChildCanServe,
): string | undefined {
  return children.find((child) => canServe(child));
}

/**
 * The child a round-robin router offers next, with the turn it hands to the request after this one.
 *
 * @summary The children that cannot serve are filtered out before the turn picks, so a child
 * standing cooling never consumes a turn it could not have taken and the live children keep
 * alternating evenly. The turn advances only when a child is actually offered, which is what keeps a
 * refused round from spending two turns on one request.
 */
export function nextRoundRobinChild(
  children: readonly string[],
  canServe: ChildCanServe,
  cursor: number,
): SpunTurn {
  const eligible = children.filter((child) => canServe(child));
  const offered = eligible[cursor % eligible.length];

  return offered === undefined
    ? { child: undefined, cursor }
    : { child: offered, cursor: cursor + 1 };
}

/**
 * The child a conditional router offers next, once a judge has named its branch.
 *
 * @summary A branch whose subtree cannot serve falls to else here rather than back at the judge,
 * because the branch was decided for the whole walk and only the health below it changed. Asking a
 * second time would spend another call to be told the same label about the same request. A router
 * that reached no branch at all offers nothing rather than guessing one, so the walk reports
 * exhaustion exactly as it does for a ladder whose children have all stood down.
 */
export function nextConditionalChild(
  branch: BranchChoice | undefined,
  canServe: ChildCanServe,
): string | undefined {
  if (branch === undefined) return undefined;

  if (canServe(branch.decided)) return branch.decided;

  return canServe(branch.elseChild) ? branch.elseChild : undefined;
}

type Turn = { cursor: () => number; advanceTo: (cursor: number) => void };

export type Picking = {
  children: readonly string[];
  canServe: ChildCanServe;
  turn: Turn;
  branch: BranchChoice | undefined;
};

type ChildPicker = (picking: Picking) => Promise<string | undefined>;

const PICK_BY_MODE: Record<RouterPolicy['mode'], ChildPicker> = {
  failover: async ({ children, canServe }) =>
    Promise.resolve(nextFailoverChild(children, canServe)),
  'round-robin': async ({ children, canServe, turn }) => {
    const spun = nextRoundRobinChild(children, canServe, turn.cursor());

    turn.advanceTo(spun.cursor);

    return Promise.resolve(spun.child);
  },
  conditional: async ({ branch, canServe }) =>
    Promise.resolve(nextConditionalChild(branch, canServe)),
};

/**
 * The child one router offers next, however its mode chooses.
 *
 * @summary Every pick answers a promise so the one mode that waits on a judge shares the walk's
 * single decision point with the two that never wait. Failover and round-robin stay ordinary
 * functions whose answers are wrapped here rather than made asynchronous, which is what leaves their
 * behavior, and their specs, untouched by a mode that classifies over the network.
 */
export async function childTheModeOffers(
  mode: RouterPolicy['mode'],
  picking: Picking,
): Promise<string | undefined> {
  return PICK_BY_MODE[mode](picking);
}
