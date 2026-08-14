import type { EngineGateway, EngineRouting } from '@recompose/contracts';
import type { Context } from 'hono';

import type { AttemptDeps } from './gateway-attempt';
import type { RoutingMemory } from './gateway-routing-memory';
import type { SpendGrantFor } from './gateway-spend';
import type { NoteAttempt } from './gateway-traffic-watch';
import type { WalkScene } from './gateway-walk-answer';
import type { WalkNote } from './gateway-walk-notes';
import type { ProxyDialect } from './gateway-wire';
import type { PluginHost } from './plugin-host';
import type { AIStudioRelay } from './provider/ai-studio-relay';
import type { WalkResult } from './routing/attempt-walk';
import type { CooldownLedger } from './routing/cooldown-ledger';
import type { AttemptReading } from './routing/outcome-classification';
import type { SubscriptionRuntime } from './subscription/reach';

import { unreachableTargetAnswer } from './gateway-answers';
import { readingAtNode } from './gateway-attempt';
import { beforeGatewayPlugins } from './gateway-plugin-before';
import { gatewayRequestCrossing } from './gateway-request-crossing';
import { answerTheWalkGives } from './gateway-walk-answer';
import { failedOutcome, notesThatCarriedARequest } from './gateway-walk-notes';
import { refusalResponse } from './gateway-wire';
import { missingCredential } from './refusals';
import { routerTheEntryStands } from './router-entry';
import { walkAttempts } from './routing/attempt-walk';
import { createCooldownLedger } from './routing/cooldown-ledger';
import { subscriptionRuntime } from './subscription/reach';

export type { SpendGrantContext, SpendGrantFor } from './gateway-spend';
export type { SubscriptionRuntime } from './subscription/reach';
export { subscriptionRuntime } from './subscription/reach';

export type RouterServing = { memory: RoutingMemory; noteAttempt: NoteAttempt };

/**
 * The cooling a table remembers, which is a ladder's memory and no one else's.
 *
 * @summary Cooling exists to steer a walk away from a child and toward its sibling, so a table
 * standing one target alone keeps a memory that forgets with the request. A lone target that stayed
 * cool would refuse every caller for a minute without the provider ever being asked, and no sibling
 * would be spared, so the memory it keeps is no memory at all.
 */
function ledgerTheTableUses(memory: RoutingMemory, routing: EngineRouting): CooldownLedger {
  return routerTheEntryStands(routing) === undefined
    ? createCooldownLedger(memory.now)
    : memory.ledger;
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

  return refusalResponse(
    deps.crossing.dialect,
    missingCredential(deps.gateway.displayName, deps.virtualModel.id),
  );
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

async function walkedAnswer(
  deps: AttemptDeps,
  scene: WalkScene,
  serving: RouterServing,
): Promise<Response> {
  const routing = deps.virtualModel.routing;
  let answerable: Response | undefined;
  let lastTried: string | undefined;

  const result = await walkAttempts<Response>({
    routing,
    slug: deps.gateway.slug,
    virtualModel: deps.virtualModel.id,
    ledger: ledgerTheTableUses(serving.memory, routing),
    cursors: serving.memory.cursors,
    now: serving.memory.now,
    attempt: async (routeNode) => {
      const reading = await readingAtNode(deps, routeNode);

      answerable = answerableOf(deps, reading);
      lastTried = routeNode;

      return reading;
    },
  });

  for (const note of notesOwedACable(result.notes, lastTried)) {
    serving.noteAttempt(note.routeNode, failedOutcome(note, serving.memory.now()));
  }

  return answerTheWalkGives(scene, result, answerable);
}

/**
 * One client request served across the table its virtual model binds.
 *
 * @summary The walk decides which child to try and this composes what a try means: resolve custody
 * for that one seat, forward, read the answer at the commit latch, and hand back a reading. Nothing
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
