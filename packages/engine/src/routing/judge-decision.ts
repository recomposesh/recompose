import type { RouterPolicy } from '@recompose/contracts';

import type { JudgeReading } from './outcome-classification';
import type { BranchChoice, BranchRule, ConditionalPolicy } from './policies';

import { classifyJudge } from './outcome-classification';
import { branchWearingTheLabel, childTheLabelNames } from './policies';

/**
 * How one router asks its judge, naming itself as well as the judge it asks.
 *
 * @summary The router rides along because a person watching the canvas watches the router's own
 * tie, and one judge two routers share would otherwise light a cable that is not waiting on it.
 * Nothing here is content: the branches and the directive are the router's own words, never the
 * caller's.
 */
export type BranchClassifier = (
  routeNode: string,
  judge: string,
  branches: readonly BranchRule[],
  directive?: string,
) => Promise<JudgeReading>;

/**
 * What a caller brings to a walk about judging: who classifies, where a branch is kept, and where
 * the judge's own stand-down is remembered.
 *
 * @summary These travel together or not at all, because a classifier with nowhere to write the
 * branch it earned would re-judge every turn of a conversation and a pin nobody wrote is a pin
 * nobody reads. The judge's cooling rides here rather than on the walk's own ledger, because that
 * ledger forgets with the request on a table with no sibling target to steer toward, while the
 * judge's stand-down is written to the gateway's memory and must be read from the store it was
 * written to, or a judge that already refused is asked again on the very table least able to
 * afford it.
 */
export type JudgedRequest = {
  classifyBranch: BranchClassifier;
  judgeStandsCooling: (judge: string) => boolean;
  pinnedBranchAt: (routeNode: string) => string | undefined;
  pinBranchAt: (routeNode: string, child: string) => void;
};

/**
 * The branch one router settled on, and whether any judgment at all placed the request there.
 *
 * @summary The child alone cannot tell a router working from a judge in trouble, because the else
 * child stands in both choices. Whether a judgment placed the request is what parts them, and it is
 * what the walk reads to decide between serving and refusing, so the fact rides beside the choice
 * rather than inside the mode's own picking.
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
  routeNode: string;
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
 * A conversation that reached the else child reached it on this request's own words, so pinning it
 * would answer every later turn with one turn's reading. Whether a judgment placed the child at all
 * is a second question, and the one the walk acts on: a judge that answered a word no branch wears
 * is the router doing what it was drawn to do, while a judge that answered nothing is trouble no
 * child should absorb.
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
 * answer named no branch for. Both were placed by a judgment, and neither has anything new worth
 * writing down.
 */
function settledWithoutAPin(child: string): Decided {
  return { child, earnsAPin: false, judged: true };
}

/**
 * A request no judgment placed, which its router refuses rather than routing.
 *
 * @summary The else child rides along so the choice stays a whole `BranchChoice` for anyone reading
 * which two children this router narrowed itself to. Nothing ever serves it: the walk stops at the
 * router the moment it reads a choice nothing judged.
 */
function nothingJudgedIt(elseChild: string): Decided {
  return { child: elseChild, earnsAPin: false, judged: false };
}

async function readingOneAskEarns(asking: Asking): Promise<JudgeReading> {
  return asking.classify(
    asking.question.routeNode,
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

/**
 * What the judge's second and final answer settles, whichever way it reads.
 *
 * @summary Final however it reads is what bounds a request at two calls, but the two ways of not
 * naming a branch part company here. A word no branch wears is a judge that read the request and
 * placed it nowhere, which is exactly what the else child is for. A refusal or a silence is a judge
 * that could not classify at all, and a request nothing judged is refused rather than handed to a
 * child no judgment chose.
 */
async function childASecondAskEarns(asking: Asking): Promise<Decided> {
  const reading = await readingOneAskEarns(asking);
  const question = asking.question;

  if (classifyJudge(reading).verdict !== 'answered') return nothingJudgedIt(question.elseChild);

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
    : nothingJudgedIt(asking.question.elseChild);
}

function pinTheTurnKeeps(question: BranchQuestion): string | undefined {
  const reads = question.resumesServerState || !question.rejudgeEveryRequest;

  return reads ? question.pinnedBranch : undefined;
}

async function childNoPinNames(question: BranchQuestion): Promise<Decided> {
  if (question.resumesServerState) return nothingJudgedIt(question.elseChild);

  const classify = question.judgeStandsCooling ? undefined : question.classify;

  return classify === undefined
    ? nothingJudgedIt(question.elseChild)
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
 * read here as no judge at all, and the request goes back unjudged without spending a call the
 * ledger already knows would fail.
 *
 * A turn resuming state one account holds never earns a fresh judgment: it follows its pin when one
 * exists and is refused when none does. Re-judging it could hand a sealed conversation to a second
 * account that cannot read the token it carries, and sending it down else would hand that same token
 * to the one child the judge never chose. That is also why re-judge every request skips the pin on
 * an ordinary turn but never on this one.
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
    routeNode,
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
/**
 * The branch one conditional router follows, judged where there is anything to judge.
 *
 * @summary A router carrying no branches has nothing to decide between, so the else child is the
 * only answer a judge could ever come back with. Asking anyway spends a model call to learn that,
 * and a judge with no labels to pick from returns no verdict, which refuses a request the router
 * had exactly one place to send.
 */
export async function branchTheWalkFollows(
  routeNode: string,
  policy: RouterPolicy,
  judging: Judging,
): Promise<JudgedChoice | undefined> {
  if (policy.mode !== 'conditional') return undefined;

  if (policy.branches.length === 0) {
    return { decided: policy.elseChild, elseChild: policy.elseChild, judged: true };
  }

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
