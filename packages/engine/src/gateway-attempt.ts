import type { EngineGateway, EngineVirtualModel, SpendGrant } from '@recompose/contracts';
import type { Context } from 'hono';

import type { SpendGrantFor } from './gateway-spend';
import type { UpstreamCommit } from './gateway-stream-commit';
import type { Crossing, JsonObject, ProviderDialect } from './gateway-wire';
import type { PluginGatewayTarget } from './plugin-gateway';
import type { PluginHost } from './plugin-host';
import type { AIStudioRelay } from './provider/ai-studio-relay';
import type { CoolingSignal } from './routing/cooldown-signal';
import type { AttemptReading } from './routing/outcome-classification';
import type { SubscriptionRuntime } from './subscription/reach';

import { unreachableTargetMessage } from './gateway-answers';
import { outboundBodyFor } from './gateway-outbound-body';
import { answerThroughPlugins } from './gateway-plugin-response';
import { dialectFor } from './gateway-provider-dialect';
import { upstreamAtTheCommitLatch } from './gateway-stream-commit';
import { InvalidJsonBodyError, refusalResponse } from './gateway-wire';
import { pluginGatewayTarget, reachPluginExecutor } from './plugin-gateway';
import { reachCredentialed } from './provider/credentialed-reach';
import { coolUntilTheProviderNames } from './routing/cooldown-signal';
import { parseSubscriptionCredential } from './subscription/credentials';
import { reachSubscription } from './subscription/reach';

export type AttemptDeps = {
  c: Context;
  gateway: EngineGateway;
  virtualModel: EngineVirtualModel;
  crossing: Crossing;
  spendGrantFor: SpendGrantFor;
  fetchLike: typeof fetch;
  subscriptions: SubscriptionRuntime;
  now: () => number;
  aiStudio?: AIStudioRelay | undefined;
  plugins?: PluginHost | undefined;
};

type Resolved = Extract<SpendGrant, { verdict: 'resolved' }>;

type UpstreamReach = { kind: 'reached'; committed: UpstreamCommit } | { kind: 'transport-failure' };

function recomposeAnswered(answer: Response): AttemptReading<Response> {
  return { kind: 'refused', status: answer.status, answer, retryableHint: false };
}

function locallyAnswered(answer: Response): AttemptReading<Response> {
  return answer.ok ? { kind: 'served', answer } : recomposeAnswered(answer);
}

function coolingTheHeadersReport(headers: Headers, now: number): { cooling?: CoolingSignal } {
  const cooling = coolUntilTheProviderNames(headers, now);

  return cooling === undefined ? {} : { cooling };
}

function hasMalformedSubscription(grant: SpendGrant): boolean {
  return (
    grant.verdict === 'resolved' &&
    grant.spend.custody === 'subscription' &&
    parseSubscriptionCredential(grant.spend.provider, grant.spend.credential) === null
  );
}

function isAntigravitySubscription(grant: Resolved): boolean {
  return grant.spend.custody === 'subscription' && grant.spend.provider === 'antigravity';
}

function crossingWithCompatibility(crossing: Crossing, grant: Resolved): Crossing {
  return grant.spend.custody === 'credentialed' && grant.spend.isCompat === true
    ? { ...crossing, isCompat: true }
    : crossing;
}

function effectiveProviderCrossing(
  crossing: Crossing,
  target: PluginGatewayTarget | null | undefined,
): Crossing {
  return target?.kind === 'provider' && target.providerModel !== undefined
    ? { ...crossing, providerModel: target.providerModel }
    : crossing;
}

async function sentUpstream(
  deps: AttemptDeps,
  crossing: Crossing,
  grant: Resolved,
  body: JsonObject,
): Promise<Response> {
  if (grant.spend.custody === 'subscription') {
    return reachSubscription(
      grant,
      body,
      deps.subscriptions,
      crossing.sessionId,
      crossing.dialect,
      crossing.replayScopeId,
      crossing.responsesLite,
      { crossing, plugins: deps.plugins },
    );
  }

  return reachCredentialed(crossing, grant, body, deps.fetchLike, deps.aiStudio, deps.plugins);
}

/**
 * Whether the provider answered at all, told apart from what it answered.
 *
 * @summary A connection that died carrying no status is a reading of its own, built before any status
 * is consulted, so it can never be mistaken for an answer the caller should keep. The distinction is
 * what lets a sibling take a turn the transport never gave the first child. The guard spans the
 * commit latch as well as the send, because the latch reads the upstream body and a body that dies
 * mid-event died before the caller was owed a byte, which is the same nothing a refused connection
 * gave. Ending the guard at the send would let that death cross the walk as a throw, and a throw is
 * the one shape failover cannot read.
 */
async function reachedUpstream(
  deps: AttemptDeps,
  crossing: Crossing,
  grant: Resolved,
  body: JsonObject,
): Promise<UpstreamReach> {
  try {
    const upstream = await sentUpstream(deps, crossing, grant, body);

    return { kind: 'reached', committed: await upstreamAtTheCommitLatch(upstream, crossing) };
  } catch (failure) {
    if (failure instanceof InvalidJsonBodyError) {
      throw failure;
    }

    console.error(unreachableTargetMessage(crossing), failure);

    return { kind: 'transport-failure' };
  }
}

async function readingFromUpstream(
  deps: AttemptDeps,
  crossing: Crossing,
  latched: UpstreamCommit,
  upstreamDialect: ProviderDialect,
): Promise<AttemptReading<Response>> {
  const upstream = latched.upstream;
  const answer = await answerThroughPlugins(crossing, upstream, upstreamDialect, deps.plugins);
  const cooling = coolingTheHeadersReport(upstream.headers, deps.now());

  if (latched.kind === 'error-before-commit') {
    return {
      kind: 'stream-error-before-commit',
      equivalentStatus: latched.equivalentStatus,
      answer,
      ...cooling,
    };
  }

  return upstream.ok
    ? { kind: 'served', answer }
    : { kind: 'refused', status: upstream.status, answer, ...cooling };
}

async function readingFromProvider(
  deps: AttemptDeps,
  crossing: Crossing,
  grant: Resolved,
): Promise<AttemptReading<Response>> {
  const upstreamDialect = dialectFor(grant, crossing.dialect);
  const outbound = outboundBodyFor(crossing, upstreamDialect, isAntigravitySubscription(grant));

  if ('refusal' in outbound) {
    return recomposeAnswered(refusalResponse(crossing.dialect, outbound.refusal));
  }

  const reached = await reachedUpstream(deps, crossing, grant, outbound.body);

  return reached.kind === 'transport-failure'
    ? reached
    : readingFromUpstream(deps, crossing, reached.committed, upstreamDialect);
}

async function readingFromExecutor(
  deps: AttemptDeps,
  crossing: Crossing,
  grant: Resolved,
  target: Extract<PluginGatewayTarget, { kind: 'executor' }>,
): Promise<AttemptReading<Response>> {
  const outbound = outboundBodyFor(crossing, target.inputDialect);

  if ('refusal' in outbound) {
    return recomposeAnswered(refusalResponse(crossing.dialect, outbound.refusal));
  }

  const upstream = await reachPluginExecutor(target, crossing, grant, outbound.body, deps.plugins);

  return locallyAnswered(
    await answerThroughPlugins(crossing, upstream, target.outputDialect, deps.plugins),
  );
}

async function readingFromResolved(
  deps: AttemptDeps,
  crossing: Crossing,
  grant: Resolved,
): Promise<AttemptReading<Response>> {
  const target = await pluginGatewayTarget(deps.c, crossing, grant, deps.plugins);
  const compatible = crossingWithCompatibility(crossing, grant);

  return target?.kind === 'executor'
    ? readingFromExecutor(deps, compatible, grant, target)
    : readingFromProvider(deps, effectiveProviderCrossing(compatible, target), grant);
}

/**
 * What one child's custody came to, which is a reading about that child and about nothing else.
 *
 * @summary Neither answer a grant can refuse with ends the walk, because both describe the one seat
 * that was asked about: an account that left the registry took nothing from its siblings, and a
 * credential that could not be opened took nothing either. They stay two readings rather than one so
 * the refusal a person eventually reads names the repair the seat actually needs.
 */
async function readingFromGrant(
  deps: AttemptDeps,
  crossing: Crossing,
  grant: SpendGrant,
): Promise<AttemptReading<Response>> {
  if (grant.verdict === 'missing-target') {
    return { kind: 'grant-missing-target' };
  }

  if (grant.verdict !== 'resolved' || hasMalformedSubscription(grant)) {
    return { kind: 'grant-missing-credential' };
  }

  return readingFromResolved(deps, crossing, grant);
}

/**
 * What one child made of the request: an answer to keep, or a reason to try the next child.
 *
 * @summary Custody is resolved here rather than once per request, so a ladder spends the account each
 * child names and a refusal about one child says nothing about any other. A seat the table already
 * stands unbound reads as a missing target without a grant ever being asked, which is the same
 * reading a grant answers for the same seat once the table catches up, so the words a person reads
 * never turn on how fresh the table is. Every refusal recompose writes itself is marked as one no
 * sibling could cure, so a translation the gateway could not perform never spends a second account
 * proving it again.
 */
export async function readingAtNode(
  deps: AttemptDeps,
  routeNode: string,
): Promise<AttemptReading<Response>> {
  const node = deps.virtualModel.routing.nodes[routeNode];

  if (node?.kind !== 'target' || node.standing.standing !== 'bound') {
    return { kind: 'grant-missing-target' };
  }

  const crossing: Crossing = { ...deps.crossing, providerModel: node.standing.providerModel };
  const grant = await deps.spendGrantFor(deps.gateway.slug, deps.virtualModel.id, routeNode);

  return readingFromGrant(deps, crossing, grant);
}
