import type { SpendGrant, SubscriptionProviderId } from '@recompose/contracts';

import type { Crossing, JsonObject } from '../gateway-wire';
import type { PluginHost } from '../plugin-host';
import type { AIStudioRelay } from '../provider/ai-studio-relay';
import type { SubscriptionRuntime } from './reach';

import { reachCredentialed } from '../provider/credentialed-reach';
import { readySubscriptionCredential, refreshedAndPersisted } from './reach-credential';

type ResolvedGrant = Extract<SpendGrant, { verdict: 'resolved' }>;

type PlanSpend = Extract<ResolvedGrant['spend'], { custody: 'subscription' }>;

export type PlanAsKeyReach = {
  fetchLike: typeof fetch;
  subscriptions: SubscriptionRuntime;
  aiStudio?: AIStudioRelay | undefined;
  plugins?: PluginHost | undefined;
};

/**
 * The plans whose token is spent the way a pasted key is spent, and who renews each one.
 *
 * @summary Both vendors serve a plan token and a pasted key at one address, in one dialect, under
 * one bearer header, so a plan turn rides the transport a key already rides rather than a second
 * copy of it kept in step by hand. They differ only in who renews: the engine renews Kimi's
 * fifteen-minute token itself, while a Copilot turn already carries the short-lived credential the
 * parent bought against the one GitHub issued, so there is nothing here left to renew.
 */
const PLANS_SPENT_AS_A_KEY: ReadonlyMap<SubscriptionProviderId, { renewedHere: boolean }> = new Map(
  [
    ['kimi', { renewedHere: true }],
    ['copilot', { renewedHere: false }],
  ],
);

export function planSpentAsAKey(grant: ResolvedGrant): PlanSpend | undefined {
  const spend = grant.spend;

  if (spend.custody !== 'subscription' || !PLANS_SPENT_AS_A_KEY.has(spend.provider)) {
    return undefined;
  }

  return spend;
}

function renewedHere(spend: PlanSpend): boolean {
  return PLANS_SPENT_AS_A_KEY.get(spend.provider)?.renewedHere === true;
}

/**
 * The same grant with the plan's token in hand, spelled the way a pasted key is spelled.
 *
 * @summary What a plan carries that a key does not is renewal, and that stays above this call. Once
 * the token is in hand the two are the same thing on the wire, which is why the spend is rewritten
 * rather than a second transport being written for it.
 */
function spentAsAKey(grant: ResolvedGrant, spend: PlanSpend, accessToken: string): ResolvedGrant {
  return {
    ...grant,
    spend: {
      custody: 'credentialed',
      provider: spend.provider,
      credential: accessToken,
      accountId: spend.accountId,
    },
  };
}

/**
 * Whether an answer says the token lapsed between the readiness check and the send.
 *
 * @summary A Kimi access token lives fifteen minutes, so a turn that started inside the renewal
 * margin can still meet a token the far end has already retired. Renewing once and sending again is
 * what keeps that from reaching a person as a sign-in they already did. A plan the engine does not
 * renew is left alone, because the credential it carries was bought for this turn by the parent.
 *
 * The lapsed answer is closed before the retry, because nobody will read it and an unread body
 * leaves the attempt it opened standing in flight for as long as the app runs.
 */
function tokenLapsed(answer: Response, spend: PlanSpend): boolean {
  return answer.status === 401 && spend.renewal === 'app' && renewedHere(spend);
}

async function tokenInHand(
  spend: PlanSpend,
  reach: PlanAsKeyReach,
): Promise<{ blob: string; accessToken: string }> {
  if (!renewedHere(spend)) {
    return { blob: spend.credential, accessToken: spend.credential };
  }

  const ready = await readySubscriptionCredential(spend, reach.subscriptions);

  return { blob: ready.blob, accessToken: ready.credential.accessToken };
}

export async function reachPlanAsAKey(
  crossing: Crossing,
  grant: ResolvedGrant,
  spend: PlanSpend,
  body: JsonObject,
  reach: PlanAsKeyReach,
): Promise<Response> {
  const ready = await tokenInHand(spend, reach);
  const sent = async (accessToken: string): Promise<Response> =>
    reachCredentialed(
      crossing,
      spentAsAKey(grant, spend, accessToken),
      body,
      reach.fetchLike,
      reach.aiStudio,
      reach.plugins,
    );

  const answer = await sent(ready.accessToken);

  if (!tokenLapsed(answer, spend)) {
    return answer;
  }

  void answer.body?.cancel().catch(() => undefined);

  const renewed = await refreshedAndPersisted(spend, ready.blob, reach.subscriptions);

  return sent(renewed.credential.accessToken);
}
