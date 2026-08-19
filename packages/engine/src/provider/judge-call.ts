import type { SpendGrant } from '@recompose/contracts';

import type { Crossing, JsonObject, ProxyDialect } from '../gateway-wire';
import type {
  AttemptReading,
  AttemptVerdict,
  JudgeReading,
} from '../routing/outcome-classification';
import type { BranchRule } from '../routing/policies';

import { dialectFor } from '../gateway-provider-dialect';
import { coolUntilTheProviderNames, DEFAULT_COOLDOWN_MS } from '../routing/cooldown-signal';
import { classify } from '../routing/outcome-classification';
import { credentialedRequestHeaders } from './credentialed-headers';
import { credentialedRequestBody, credentialedRequestUrl } from './credentialed-target';
import { judgeRequestBody, labelTheJudgeWrote } from './judge-request';

export type JudgeCooling = { coolUntilMs: number; retryAtMs?: number };

export type JudgeAsk = {
  grant: SpendGrant;
  providerModel: string;
  sourceDialect: ProxyDialect;
  gatewayName: string;
  virtualModel: string;
  branches: readonly BranchRule[];
  directive?: string | undefined;
  raw: JsonObject;
  boundMs: number;
  fetchLike: typeof fetch;
  now: () => number;
  cool: (cooling: JudgeCooling) => void;
};

type Spendable = Extract<SpendGrant, { verdict: 'resolved' }>;

type JudgeAnswer = { answered: Response } | { silent: 'timeout' | 'unreachable' };

/**
 * Whether a judge binding can be spent on a classification at all.
 *
 * @summary A plan wire carries a person's own conversation and nothing else: it has no place to put
 * a schema, no origin to post one to, and spending a subscription turn on routing would bill a quota
 * a person opened for their own work. A keyed account and a runtime a person addressed themselves
 * both post ordinary JSON to an origin, so both classify.
 */
function spendableCustody(grant: SpendGrant): Spendable | undefined {
  if (grant.verdict !== 'resolved' || grant.spend.custody === 'subscription') return undefined;

  return grant;
}

function crossingOfTheAsk(ask: JudgeAsk, grant: Spendable, body: JsonObject): Crossing {
  return {
    dialect: dialectFor(grant, ask.sourceDialect),
    raw: body,
    gatewayName: ask.gatewayName,
    virtualModel: ask.virtualModel,
    providerModel: ask.providerModel,
  };
}

/**
 * One classification call, cut off the moment its budget runs out.
 *
 * @summary The clock starts here rather than around the await, so the wait for a first byte counts
 * against the budget and the connection is actually severed when it runs out. A judge left holding a
 * socket open would otherwise keep spending on a request the walk already sent down else. The signal
 * itself tells a silence apart from a dead connection, which is more honest than reading an error
 * name that every fetch implementation spells its own way.
 */
async function answerTheJudgeGave(
  ask: JudgeAsk,
  grant: Spendable,
  crossing: Crossing,
  body: JsonObject,
): Promise<JudgeAnswer> {
  const bound = AbortSignal.timeout(ask.boundMs);

  try {
    const answered = await ask.fetchLike(credentialedRequestUrl(grant, crossing), {
      method: 'POST',
      headers: credentialedRequestHeaders(grant.spend, crossing),
      body: JSON.stringify(credentialedRequestBody(grant, crossing, body)),
      signal: bound,
    });

    return { answered };
  } catch {
    return { silent: bound.aborted ? 'timeout' : 'unreachable' };
  }
}

function readingOfARefusal(answer: Response, now: number): AttemptReading<Response> {
  const cooling = coolUntilTheProviderNames(answer.headers, now);

  return {
    kind: 'refused',
    status: answer.status,
    answer,
    ...(cooling === undefined ? {} : { cooling }),
  };
}

/**
 * The refusal reading a judge earns, stood down so the next request spends no call on it.
 *
 * @summary Nothing a judge answered ever reaches the caller, whatever its status: a 400 about a
 * schema and a 401 about a key are both this gateway's own trouble, and handing either back would
 * answer a person's request with a sentence about routing. Every one of them is a stand-down instead,
 * because a judge that refused once refuses the next request for the same reason, and the else branch
 * carries the traffic meanwhile.
 */
function standDownOf(verdict: AttemptVerdict<Response>, now: number): JudgeCooling {
  if (verdict.verdict !== 'move-on') return { coolUntilMs: now + DEFAULT_COOLDOWN_MS };

  return verdict.retryAtMs === undefined
    ? { coolUntilMs: verdict.coolUntilMs }
    : { coolUntilMs: verdict.coolUntilMs, retryAtMs: verdict.retryAtMs };
}

function refusalTheJudgeEarns(ask: JudgeAsk, reading: AttemptReading<Response>): JudgeReading {
  ask.cool(standDownOf(classify(reading, ask.now()), ask.now()));

  return { heard: 'refusal' };
}

async function readingTheAnswerGives(ask: JudgeAsk, answer: Response): Promise<JudgeReading> {
  if (!answer.ok) return refusalTheJudgeEarns(ask, readingOfARefusal(answer, ask.now()));

  const body: unknown = await answer.json().catch(() => undefined);

  return { heard: 'answer', label: labelTheJudgeWrote(body) };
}

/**
 * What one judge made of one request, in the three words the branches know how to read.
 *
 * @summary Everything that can go wrong here is a reading rather than a throw, because the walk
 * treats a judge as advice and never as a child: a silence, a refusal, and a binding that resolves to
 * nothing all leave the request whole and send it down the else branch. The caller's own words reach
 * the provider and reach nothing else, so no traffic row and no log line ever carries a second copy
 * of them.
 */
export async function readingOfTheJudge(ask: JudgeAsk): Promise<JudgeReading> {
  const grant = spendableCustody(ask.grant);

  if (grant === undefined) return refusalTheJudgeEarns(ask, { kind: 'grant-missing-credential' });

  const body = judgeRequestBody({
    dialect: dialectFor(grant, ask.sourceDialect),
    providerModel: ask.providerModel,
    branches: ask.branches,
    directive: ask.directive,
    raw: ask.raw,
  });
  const answer = await answerTheJudgeGave(ask, grant, crossingOfTheAsk(ask, grant, body), body);

  if ('answered' in answer) return readingTheAnswerGives(ask, answer.answered);

  if (answer.silent === 'timeout') return { heard: 'timeout' };

  return refusalTheJudgeEarns(ask, { kind: 'transport-failure' });
}
