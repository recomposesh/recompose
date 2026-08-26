import type { RefusalFacts, RouterAttempt, TranslationRefusal } from './refusal-wire';
import type { UnjudgedCause } from './routing/outcome-classification';

export type RouterRefusal = Extract<
  TranslationRefusal,
  { reason: 'empty-router' | 'exhausted-router' | 'chained-turn' | 'unjudged-request' }
>;

type ExhaustedRouter = Extract<RouterRefusal, { reason: 'exhausted-router' }>;

type UnjudgedRouter = Extract<RouterRefusal, { reason: 'unjudged-request' }>;

const ROUTER_REASONS = {
  'empty-router': true,
  'exhausted-router': true,
  'chained-turn': true,
  'unjudged-request': true,
} as const satisfies Record<RouterRefusal['reason'], true>;

/**
 * Whether one refusal is a router's to explain rather than the translation layer's.
 *
 * @summary The reasons are keys of a record the compiler holds to `RouterRefusal`, so an arm added
 * to that union fails the build here rather than shipping a predicate that narrows to a shape the
 * refusal never had. A list would only catch a misspelling; a record catches the omission too.
 */
export function isRouterFault(refusal: TranslationRefusal): refusal is RouterRefusal {
  return Object.hasOwn(ROUTER_REASONS, refusal.reason);
}

function whereItStood(refusal: RouterRefusal): string {
  return `The router "${refusal.routerName}" in the gateway "${refusal.displayName}"`;
}

function attemptsRead(attempts: readonly RouterAttempt[]): string {
  return attempts.map((attempt) => `${attempt.child} ${attempt.why}`).join(', ');
}

function delaySeconds(retryAtMs: number): number {
  return Math.max(0, Math.ceil((retryAtMs - Date.now()) / 1000));
}

function exhaustedAccount(refusal: ExhaustedRouter): string {
  return `${whereItStood(refusal)} has no child left to try for the virtual model "${refusal.model}": ${attemptsRead(refusal.attempts)}.`;
}

/**
 * What a router that ran out of children tells the caller, and when trying again can work.
 *
 * @summary Every child the walk touched is named with the reason it could not serve, because a person
 * reading this refusal is being asked to fix something and cannot fix what the gateway will not say.
 * The wait rides only when every attempted child promised one: a pool downed by dead connections is
 * not a rate limit, and a wait invented for it would be a lie a client would obey.
 */
function exhaustedFacts(refusal: ExhaustedRouter): RefusalFacts {
  const account = exhaustedAccount(refusal);

  if (refusal.retryAtMs === undefined) {
    return { status: 502, message: account, code: 'exhausted_router', anthropicType: 'api_error' };
  }

  const seconds = delaySeconds(refusal.retryAtMs);

  return {
    status: 429,
    message: `${account} Try again in ${String(seconds)} seconds.`,
    code: 'exhausted_router',
    anthropicType: 'api_error',
    retryAfterSeconds: seconds,
  };
}

function emptyFacts(refusal: RouterRefusal): RefusalFacts {
  return {
    status: 502,
    message: `${whereItStood(refusal)} holds no child, so the virtual model "${refusal.model}" cannot serve.`,
    code: 'empty_router',
    anthropicType: 'api_error',
  };
}

function chainedFacts(refusal: RouterRefusal): RefusalFacts {
  return {
    status: 400,
    message: `${whereItStood(refusal)} spreads requests across accounts, so it cannot carry a turn that resumes server-side state for the virtual model "${refusal.model}". Switch this router to failover, or start a conversation that doesn't resume server-side state.`,
    code: 'chained_turn',
    anthropicType: 'invalid_request_error',
  };
}

type NoVerdictReading = { what: string; repair: string };

/**
 * What each way of reaching no verdict did, and the one repair that cures it.
 *
 * @summary Four causes and four repairs, because a person told only that no verdict came back reads
 * the same sentence whether their judge is unbound, slow, standing down, or never asked at all, and
 * three of those four repairs then do nothing. The words sit in a record the compiler holds to the
 * causes, so a cause added later fails the build here rather than quietly printing somebody else's
 * repair. Nothing the judge itself wrote appears: the cause is a closed word this gateway chose, so
 * a verdict, which is model output, can never ride out on a refusal.
 */
const READINGS_OF_NO_VERDICT: Record<UnjudgedCause, NoVerdictReading> = {
  'judge-call-failed': {
    what: 'asked its judge and could not get an answer out of it',
    repair:
      'Check that the judge is bound to an account and a model that can answer, and that its account still holds a working credential.',
  },
  'judge-timed-out': {
    what: 'asked its judge and nothing came back within the judge timeout',
    repair:
      'Raise the judge timeout on this router, or bind the judge to a model that answers faster.',
  },
  'judge-standing-cooling': {
    what: 'did not ask its judge, which stands cooling after failing an earlier request',
    repair: 'Fix what stopped the judge answering, or bind this router to a judge that can answer.',
  },
  'unpinned-sealed-turn': {
    what: 'never reached its judge, because this turn resumes server-held state and no branch is pinned to the conversation',
    repair: 'Start a new conversation, so its opening turn earns a branch this router can keep.',
  },
};

function readingOfNoVerdict(refusal: UnjudgedRouter): NoVerdictReading {
  return READINGS_OF_NO_VERDICT[refusal.because];
}

/**
 * What a conditional router whose judge reached no verdict tells the caller.
 *
 * @summary It is a stand-down rather than a fault the caller caused, so it wears the status a client
 * already retries on. The else child is named because a person who drew one is owed the reason their
 * request did not take it: the else branch answers a judge that classified and found no branch
 * fitting, never a judge that could not classify at all, and routing every silence there would hand
 * one model's traffic to another for as long as the judge stayed down without anything saying so.
 * Which of the four ways it reached no verdict is named too, because the row a person opens reads
 * this very sentence and a router that says only "no verdict" leaves both surfaces equally silent.
 */
function unjudgedFacts(refusal: UnjudgedRouter): RefusalFacts {
  const reading = readingOfNoVerdict(refusal);

  return {
    status: 503,
    message: `${whereItStood(refusal)} ${reading.what}, so the virtual model "${refusal.model}" refused this request rather than sending it to the else child. ${reading.repair}`,
    code: 'unjudged_request',
    anthropicType: 'api_error',
  };
}

/**
 * The wire facts of the four refusals only a router can raise.
 *
 * @summary An empty router and an exhausted one are the gateway's own faults to report, so they wear
 * the config-fault shape beside a missing target. A chained turn is the caller's, because the request
 * asked for state one account holds and the router was told to spread, so it carries the two ways out
 * rather than a status alone. A request nothing judged is neither: the table is drawn correctly and
 * the caller asked for nothing wrong, so it reads as a service standing down.
 */
export function routerFaultFacts(refusal: RouterRefusal): RefusalFacts {
  if (refusal.reason === 'empty-router') return emptyFacts(refusal);

  if (refusal.reason === 'chained-turn') return chainedFacts(refusal);

  return refusal.reason === 'unjudged-request' ? unjudgedFacts(refusal) : exhaustedFacts(refusal);
}
