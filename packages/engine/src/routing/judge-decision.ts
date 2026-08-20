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

export type Judging = {
  classify: BranchClassifier | undefined;
  judgeStandsCooling: (judge: string) => boolean;
  pinnedBranchAt: (routeNode: string) => string | undefined;
  pinBranchAt: (routeNode: string, child: string) => void;
  resumesServerState: boolean;
  decided: Map<string, string>;
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
 * The child a conditional router settles on, and whether a judge's own word placed it there.
 *
 * @summary Only a branch a judge actually named is worth remembering for the rest of a conversation.
 * A child the else branch caught is what trouble left behind, so pinning it would let one bad minute
 * from a judge park a whole conversation on the fallback long after the judge came back. Whether to
 * pin is the whole of what anyone asks about how a child was settled, so it is the whole of what is
 * carried: a richer account of who settled it would be a field nothing reads and nothing keeps true.
 */
type Decided = { child: string; earnsAPin: boolean };

/** A child the walk follows without writing a pin, because no fresh judgment placed it there. */
function settledWithoutAPin(child: string): Decided {
  return { child, earnsAPin: false };
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
    ? { child, earnsAPin: true }
    : settledWithoutAPin(child);
}

async function childTheJudgeAnswers(asking: Asking): Promise<Decided> {
  const reading = await readingOneAskEarns(asking);
  const named = branchWearingTheLabel(asking.question.branches, labelOneReadingCarries(reading));

  if (named !== undefined) return { child: named.child, earnsAPin: true };

  return classifyJudge(reading).verdict === 'answered'
    ? childASecondAskEarns(asking)
    : settledWithoutAPin(asking.question.elseChild);
}

function pinTheTurnKeeps(question: BranchQuestion): string | undefined {
  const reads = question.resumesServerState || !question.rejudgeEveryRequest;

  return reads ? question.pinnedBranch : undefined;
}

async function childNoPinNames(question: BranchQuestion): Promise<Decided> {
  if (question.resumesServerState) return settledWithoutAPin(question.elseChild);

  const classify = question.judgeStandsCooling ? undefined : question.classify;

  return classify === undefined
    ? settledWithoutAPin(question.elseChild)
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
 * The conversation is pinned here and only here, the moment a judgment settles, so the branch a
 * request earned outlives the walk that earned it while the branch trouble picked never does.
 */
export async function branchTheWalkFollows(
  routeNode: string,
  policy: RouterPolicy,
  judging: Judging,
): Promise<BranchChoice | undefined> {
  if (policy.mode !== 'conditional') return undefined;

  const held = judging.decided.get(routeNode);

  if (held !== undefined) return { decided: held, elseChild: policy.elseChild };

  const decided = await childTheJudgeDecides(questionOf(routeNode, policy, judging));

  judging.decided.set(routeNode, decided.child);

  if (decided.earnsAPin) judging.pinBranchAt(routeNode, decided.child);

  return { decided: decided.child, elseChild: policy.elseChild };
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
