import type { EngineGateway, EngineRouting } from '@recompose/contracts';
import type { Context } from 'hono';

import type { AttemptDeps } from './gateway-attempt';
import type { Judged } from './gateway-judging';
import type { RoutingMemory } from './gateway-routing-memory';
import type { SpendGrantFor } from './gateway-spend';
import type { NoteAttempt } from './gateway-traffic-watch';
import type { WalkScene } from './gateway-walk-answer';
import type { WalkNote } from './gateway-walk-notes';
import type { ProxyDialect } from './gateway-wire';
import type { PluginHost } from './plugin-host';
import type { AIStudioRelay } from './provider/ai-studio-relay';
import type { TranslationRefusal } from './refusal-wire';
import type { WalkResult } from './routing/attempt-walk';
import type { CooldownLedger } from './routing/cooldown-ledger';
import type { AttemptReading } from './routing/outcome-classification';
import type { DeclaredTarget } from './routing/route-table';
import type { SubscriptionRuntime } from './subscription/reach';

import { unreachableTargetAnswer } from './gateway-answers';
import { readingAtNode } from './gateway-attempt';
import { turnResumesServerState } from './gateway-chained-turn';
import { judgedRouting } from './gateway-judging';
import { beforeGatewayPlugins } from './gateway-plugin-before';
import { gatewayRequestCrossing } from './gateway-request-crossing';
import { noteGatewayRow } from './gateway-traffic';
import { answerTheWalkGives } from './gateway-walk-answer';
import { failedOutcome, notesThatCarriedARequest, nothingAnsweredFor } from './gateway-walk-notes';
import { refusalResponse } from './gateway-wire';
import { missingCredential, missingTarget } from './refusals';
import { walkAttempts } from './routing/attempt-walk';
import { createCooldownLedger } from './routing/cooldown-ledger';
import { targetsInDeclaredOrder } from './routing/route-table';
import { subscriptionRuntime } from './subscription/reach';

export type { SpendGrantContext, SpendGrantFor } from './gateway-spend';
export type { SubscriptionRuntime } from './subscription/reach';
export { subscriptionRuntime } from './subscription/reach';

export type RouterServing = { memory: RoutingMemory; noteAttempt: NoteAttempt };

function couldServe(target: DeclaredTarget): boolean {
  return target.standing.standing === 'bound';
}

/**
 * The cooling a table remembers, which is a ladder's memory and no one else's.
 *
 * @summary Cooling exists to steer a walk away from a child and toward its sibling, so a table with
 * no sibling to steer toward keeps a memory that forgets with the request. A child that stayed cool
 * where the walk has nowhere else to go would refuse every caller for a minute without the provider
 * ever being asked, and no sibling would be spared, so the memory it keeps is no memory at all. The
 * question is whether a second child could serve rather than whether a router stands, because a
 * person wires a router before wiring its children and a router over one child steers nowhere. An
 * account that left is no sibling either: a walk sent to it answers for a binding a person can see
 * is broken rather than reaching any provider.
 */
function ledgerTheTableUses(memory: RoutingMemory, routing: EngineRouting): CooldownLedger {
  return targetsInDeclaredOrder(routing).filter(couldServe).length > 1
    ? memory.ledger
    : createCooldownLedger(memory.now);
}

type GrantUnmet = Extract<
  AttemptReading<Response>,
  { kind: 'grant-missing-credential' | 'grant-missing-target' }
>;

/**
 * The sentence a node whose custody failed owes the caller, in the words that node earned.
 *
 * @summary An account that left the registry and a credential that could not be opened are two
 * different repairs, so they keep the two refusals the gateway already shipped for them rather than
 * collapsing into one. A ladder never reaches here, because it speaks for every child at once.
 */
function refusalUnresolvedCustodyEarns(deps: AttemptDeps, reading: GrantUnmet): TranslationRefusal {
  return reading.kind === 'grant-missing-target'
    ? missingTarget(deps.gateway.displayName, deps.virtualModel.id)
    : missingCredential(deps.gateway.displayName, deps.virtualModel.id);
}

/**
 * What one attempt would have answered the caller, had the walk stopped there.
 *
 * @summary A child that answered hands its own answer over untouched. A child that answered nothing
 * at all still owes the caller a sentence, and only a lone target ever hears it, because a ladder
 * that ran out speaks for every child at once instead. Keeping the last one is what lets a table
 * holding a single target answer with the provider's own words rather than a router's.
 */
function answerableOf(deps: AttemptDeps, reading: AttemptReading<Response>): Response {
  if ('answer' in reading) return reading.answer;

  if (reading.kind === 'transport-failure') return unreachableTargetAnswer(deps.crossing);

  return refusalResponse(deps.crossing.dialect, refusalUnresolvedCustodyEarns(deps, reading));
}

/**
 * The failed attempts owed a cable of their own, which is every child but the last one tried.
 *
 * @summary The last child tried is the child the answer is attributed to when the body ends, so a
 * note here as well would paint one cable twice for a single request and disagree with itself about
 * what happened. A child the walk skipped because it stood cooling carried no request at all, so it
 * is named in the refusal and left off the canvas.
 */
function notesOwedACable(
  notes: WalkResult<Response>['notes'],
  lastTried: string | undefined,
): readonly WalkNote[] {
  return notesThatCarriedARequest(notes).filter((note) => note.routeNode !== lastTried);
}

/**
 * The judge and the pins one request routes under, built from the same custody a target uses.
 *
 * @summary A table with no conditional router in it never reaches any of this, so a ladder pays
 * nothing for a mode it does not use. The judge resolves per request rather than per gateway,
 * because a person can rebind it between two turns and the second turn must reach the account the
 * canvas now shows.
 */
function judgingThisRequest(deps: AttemptDeps, memory: RoutingMemory): Judged {
  return judgedRouting({
    routing: deps.virtualModel.routing,
    slug: deps.gateway.slug,
    virtualModel: deps.virtualModel.id,
    crossing: deps.crossing,
    spendGrantFor: deps.spendGrantFor,
    fetchLike: deps.fetchLike,
    memory,
  });
}

async function walkedAnswer(
  deps: AttemptDeps,
  scene: WalkScene,
  serving: RouterServing,
): Promise<Response> {
  const routing = deps.virtualModel.routing;
  const judged = judgingThisRequest(deps, serving.memory);
  let answerable: Response | undefined;
  let lastTried: string | undefined;

  const result = await walkAttempts<Response>({
    routing,
    slug: deps.gateway.slug,
    virtualModel: deps.virtualModel.id,
    ledger: ledgerTheTableUses(serving.memory, routing),
    cursors: serving.memory.cursors,
    resumesServerState: turnResumesServerState(deps.crossing.raw),
    now: serving.memory.now,
    classifyBranch: judged.classifyBranch,
    pinnedBranchAt: judged.pinnedBranchAt,
    pinBranchAt: judged.pinBranchAt,
    attempt: async (routeNode) => {
      const reading = await readingAtNode(deps, routeNode);

      answerable = answerableOf(deps, reading);
      lastTried = routeNode;

      return reading;
    },
  });

  for (const note of notesOwedACable(result.notes, lastTried)) {
    const outcome = failedOutcome(note, serving.memory.now());

    serving.noteAttempt(note.routeNode, outcome);

    if (nothingAnsweredFor(note)) noteGatewayRow(outcome.status, outcome.detail);
  }

  return answerTheWalkGives(scene, result, answerable);
}

/**
 * One client request served across the table its virtual model binds.
 *
 * @summary The walk decides which child to try and this composes what a try means: resolve custody
 * for that one node, forward, read the answer at the commit latch, and hand back a reading. Nothing
 * here knows the order children are tried in, and the walk knows nothing about credentials or
 * transports, which is what lets one of them be reasoned about without the other.
 */
export async function proxyModelRequest(
  c: Context,
  dialect: ProxyDialect,
  gateway: EngineGateway,
  spendGrantFor: SpendGrantFor,
  fetchLike: typeof fetch,
  serving: RouterServing,
  subscriptions: SubscriptionRuntime = subscriptionRuntime(),
  aiStudio?: AIStudioRelay,
  plugins?: PluginHost,
  modelOverride?: string,
  streamOverride?: boolean,
): Promise<Response> {
  const lookup = await gatewayRequestCrossing(c, dialect, gateway, modelOverride, streamOverride);

  if ('response' in lookup) return lookup.response;

  const intercepted = await beforeGatewayPlugins(c, lookup.crossing, plugins);

  if ('response' in intercepted) return intercepted.response;

  const virtualModel = lookup.virtualModel;
  const deps: AttemptDeps = {
    c,
    gateway,
    virtualModel,
    crossing: intercepted.crossing,
    spendGrantFor,
    fetchLike,
    subscriptions,
    now: serving.memory.now,
    aiStudio,
    plugins,
  };

  return walkedAnswer(deps, { crossing: intercepted.crossing, gateway, virtualModel }, serving);
}
