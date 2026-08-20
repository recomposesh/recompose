import type { RouterPolicy } from '@recompose/contracts';

import type { JudgeReading } from './outcome-classification';
import type { BranchChoice, BranchRule, ConditionalPolicy } from './policies';

import { classifyJudge } from './outcome-classification';
import { branchWearingTheLabel, childTheLabelNames } from './policies';

export type BranchClassifier = (
  judge: string,
  branches: readonly BranchRule[],
  directive?: string,
) => Promise<JudgeReading>;

/**
 * What a caller brings to a walk about judging: who classifies, and where a branch is kept.
 *
 * @summary The three travel together or not at all, because a classifier with nowhere to write the
 * branch it earned would re-judge every turn of a conversation and a pin nobody wrote is a pin
 * nobody reads. Taking them as one object is what stops a caller from wiring two of the three.
 */
export type JudgedRequest = {
  classifyBranch: BranchClassifier;
  pinnedBranchAt: (routeNode: string) => string | undefined;
  pinBranchAt: (routeNode: string, child: string) => void;
};

/**
 * The branch one router settled on, and whether any judgment at all placed the request there.
 *
 * @summary A request the judge could not classify lands on the else child exactly as a judgment
 * naming no branch does, so the child alone cannot tell a router working from a judge in trouble.
 * The account a refusal owes turns on precisely that, and nothing downstream of the pick reads it,
 * which is why the fact rides beside the choice rather than inside the mode's own picking.
 */
export type JudgedChoice = BranchChoice & { judged: boolean };

export type Judging = {
  classify: BranchClassifier | undefined;
  judgeStandsCooling: (judge: string) => boolean;
  pinnedBranchAt: (routeNode: string) => string | undefined;
  pinBranchAt: (routeNode: string, child: string) => void;
  resumesServerState: boolean;
  decided: Map<string, JudgedChoice>;
};

type BranchQuestion = {
  judge: string;
  branches: readonly BranchRule[];
  directive: string | undefined;
  elseChild: string;
  classify: BranchClassifier | undefined;
  judgeStandsCooling: boolean;
  pinnedBranch: string | undefined;
  resumesServerState: boolean;
  rejudgeEveryRequest: boolean;
};

type Asking = { question: BranchQuestion; classify: BranchClassifier };

/**
 * The child a conditional router settles on, and the two things anyone asks about how it got there.
 *
 * @summary Only a branch a judge actually named is worth remembering for the rest of a conversation.
 * A child the else branch caught is what trouble left behind, so pinning it would let one bad minute
 * from a judge park a whole conversation on the fallback long after the judge came back. Whether a
 * judgment placed the child at all is a second question, because the else child catches a judge that
 * answered a word no branch wears and a judge that never answered alike, and only the first of those
 * is the router doing what it was drawn to do.
 */
type Decided = { child: string; earnsAPin: boolean; judged: boolean };

/** The branch a judge's own word named, which the conversation keeps for the turns after it. */
function judgedOntoABranch(child: string): Decided {
  return { child, earnsAPin: true, judged: true };
}

/**
 * A child a judgment placed that writes no fresh pin of its own.
 *
 * @summary Two ways in: the pin a conversation already earned, and the else child a judge's own
 * answer fell to. Both were placed by a judgment, and neither has anything new worth writing down.
 */
function settledWithoutAPin(child: string): Decided {
  return { child, earnsAPin: false, judged: true };
}

/** The else child a request reaches with no judgment of any kind behind it. */
function fellToElseUnjudged(elseChild: string): Decided {
  return { child: elseChild, earnsAPin: false, judged: false };
}

async function readingOneAskEarns(asking: Asking): Promise<JudgeReading> {
  return asking.classify(
    asking.question.judge,
    asking.question.branches,
    asking.question.directive,
  );
}

/**
 * The word a judge answered with, or nothing where the reading carried no answer at all.
 *
 * @summary The one place a reading is narrowed to its word, so the label table and the pin question
 * are answered from a single reading of the verdict rather than classifying the same answer twice.
 */
function labelOneReadingCarries(reading: JudgeReading): string | undefined {
  const verdict = classifyJudge(reading);

  return verdict.verdict === 'answered' ? verdict.label : undefined;
}

function labelABranchWears(question: BranchQuestion, reading: JudgeReading): boolean {
  return branchWearingTheLabel(question.branches, labelOneReadingCarries(reading)) !== undefined;
}

async function childASecondAskEarns(asking: Asking): Promise<Decided> {
  const reading = await readingOneAskEarns(asking);
  const question = asking.question;
  const child = childOneReadingNames(question.branches, question.elseChild, reading);

  return labelABranchWears(question, reading)
    ? judgedOntoABranch(child)
    : settledWithoutAPin(child);
}

async function childTheJudgeAnswers(asking: Asking): Promise<Decided> {
  const reading = await readingOneAskEarns(asking);
  const named = branchWearingTheLabel(asking.question.branches, labelOneReadingCarries(reading));

  if (named !== undefined) return judgedOntoABranch(named.child);

  return classifyJudge(reading).verdict === 'answered'
    ? childASecondAskEarns(asking)
    : fellToElseUnjudged(asking.question.elseChild);
}

function pinTheTurnKeeps(question: BranchQuestion): string | undefined {
  const reads = question.resumesServerState || !question.rejudgeEveryRequest;

  return reads ? question.pinnedBranch : undefined;
}

async function childNoPinNames(question: BranchQuestion): Promise<Decided> {
  if (question.resumesServerState) return fellToElseUnjudged(question.elseChild);

  const classify = question.judgeStandsCooling ? undefined : question.classify;

  return classify === undefined
    ? fellToElseUnjudged(question.elseChild)
    : childTheJudgeAnswers({ question, classify });
}

/**
 * The child one conditional router hands this request to, judged at most twice.
 *
 * @summary Only an answer earns the second ask. A refusal and a silence past the budget are the
 * judge saying it cannot classify at all, so asking again spends a second call to learn the same
 * thing, while an answer no branch wears may well be the judge misreading a closed set it can read
 * on a second look. The second answer is final however it reads, which is what bounds a request at
 * two judge calls no matter how strangely the judge behaves. A judge already standing cooling is
 * read here as no judge at all, so the else branch is reached without spending a call the ledger
 * already knows would fail.
 *
 * A turn resuming state one account holds never earns a fresh judgment: it follows its pin when one
 * exists and takes the else branch when none does. Re-judging it could hand a sealed conversation to
 * a second account that cannot read the token it carries, and refusing it, the way a spreading
 * router does, would break the promise that routing trouble never drops a request. That is also why
 * re-judge every request skips the pin on an ordinary turn but never on this one.
 */
async function childTheJudgeDecides(question: BranchQuestion): Promise<Decided> {
  const pinned = pinTheTurnKeeps(question);

  return pinned === undefined ? childNoPinNames(question) : settledWithoutAPin(pinned);
}

function questionOf(
  routeNode: string,
  policy: ConditionalPolicy,
  judging: Judging,
): BranchQuestion {
  return {
    judge: policy.judge,
    branches: policy.branches,
    directive: policy.directive,
    elseChild: policy.elseChild,
    classify: judging.classify,
    judgeStandsCooling: judging.judgeStandsCooling(policy.judge),
    pinnedBranch: judging.pinnedBranchAt(routeNode),
    resumesServerState: judging.resumesServerState,
    rejudgeEveryRequest: policy.rejudgeEveryRequest,
  };
}

/**
 * The branch one conditional router follows for a whole walk, decided at most once.
 *
 * @summary The memo belongs to the walk rather than to the gateway, so the attempt cap can retry a
 * branch child eight times without spending eight judge calls, eight charges, and eight seconds of
 * a caller's patience. It is keyed by route node because a chain can hold several conditional
 * routers, each owed its own single decision. A router of any other mode answers nothing here, which
 * is what keeps failover and round-robin from ever reaching a judge.
 *
 * The whole choice is remembered rather than the branch alone, so a later reader learns which two
 * children this router narrowed itself to, and whether a judgment placed the request there at all,
 * without going back to a policy that cannot say either. A walk accounting for the children it never
 * reached is exactly such a reader.
 *
 * The conversation is pinned here and only here, the moment a judgment settles, so the branch a
 * request earned outlives the walk that earned it while the branch trouble picked never does.
 */
export async function branchTheWalkFollows(
  routeNode: string,
  policy: RouterPolicy,
  judging: Judging,
): Promise<JudgedChoice | undefined> {
  if (policy.mode !== 'conditional') return undefined;

  const held = judging.decided.get(routeNode);

  if (held !== undefined) return held;

  const decided = await childTheJudgeDecides(questionOf(routeNode, policy, judging));
  const choice = {
    decided: decided.child,
    elseChild: policy.elseChild,
    judged: decided.judged,
  };

  judging.decided.set(routeNode, choice);

  if (decided.earnsAPin) judging.pinBranchAt(routeNode, decided.child);

  return choice;
}

/**
 * The one child a conditional router hands the request to for one reading of its judge.
 *
 * @summary Total by construction: the reading table sends every trouble to else and the label table
 * sends every unrecognized answer there too, so the two compose into a mapping no judge behavior
 * can fall out of. That totality is what lets the walk ask once and act, rather than carrying a
 * "the judge said something strange" state the rest of the walk would have to understand.
 */
export function childOneReadingNames(
  branches: readonly BranchRule[],
  elseChild: string,
  reading: JudgeReading,
): string {
  return childTheLabelNames(branches, elseChild, labelOneReadingCarries(reading));
}
