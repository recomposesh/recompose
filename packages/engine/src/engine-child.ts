import {
  type EngineDirective,
  engineBranchPinReportSchema,
  engineCooldownReportSchema,
  engineDirectiveSchema,
  engineJudgingReportSchema,
  engineLogReportSchema,
  engineReportSchema,
  engineTrafficReportSchema,
} from '@recompose/contracts';

import type { SubscriptionRuntime } from './gateway-proxy';
import type { ParentPort } from './parent-port';
import type { PluginHost } from './plugin-host';

import { openCredentialUpdateLane, openSpendLane } from './engine-child-lanes';
import { createEngineRuntime, type EngineRuntime, type OpenListeners } from './engine-runtime';
import { subscribeToBranchPinTallies } from './gateway-branch-pins-watch';
import { subscribeToCooldowns } from './gateway-cooldowns-watch';
import { subscribeToJudging } from './gateway-judging-watch';
import { subscriptionRuntime } from './gateway-proxy';
import { type NoteTraffic, subscribeToLogRows } from './gateway-traffic';
import { loopbackOverrideOrNull } from './loopback-override';
import { probeKey } from './provider/key-probe';
import { listProviderModels } from './provider/model-list';
import { probeRuntime } from './provider/runtime-probe';
import { claudeAddressBehind } from './subscription/claude-oauth-profile';

function probeOriginFor(origin: string): string {
  return (
    loopbackOverrideOrNull('RECOMPOSE_PROBE_ORIGIN', process.env['RECOMPOSE_PROBE_ORIGIN']) ??
    origin
  );
}

function runtimeOriginFor(address: string): string {
  return (
    loopbackOverrideOrNull('RECOMPOSE_RUNTIME_ORIGIN', process.env['RECOMPOSE_RUNTIME_ORIGIN']) ??
    address
  );
}

function kindOf(directive: { kind: string }): string {
  return directive.kind;
}

type RefusalIssue = { path: readonly PropertyKey[]; code: string };

function sanitizedRefusal(issues: readonly RefusalIssue[]): { path: string; code: string }[] {
  return issues.map((issue) => ({
    path: issue.path.map((segment) => String(segment)).join('.'),
    code: issue.code,
  }));
}

type LookDirective = Extract<
  EngineDirective,
  { kind: 'probe' | 'probe-runtime' | 'list-models' | 'claude-address' }
>;

async function lookAnswerFor(fetchLike: typeof fetch, directive: LookDirective): Promise<unknown> {
  switch (directive.kind) {
    case 'probe':
      return {
        kind: 'key-check',
        answers: directive.id,
        ...(await probeKey(fetchLike, probeOriginFor(directive.origin), directive.custody)),
      };
    case 'probe-runtime':
      return {
        kind: 'runtime-check',
        answers: directive.id,
        reachability: await probeRuntime(
          fetchLike,
          runtimeOriginFor(directive.address),
          directive.provider,
        ),
      };
    case 'list-models':
      return {
        kind: 'model-list',
        answers: directive.id,
        listing: await listProviderModels(fetchLike, directive.origin, directive.custody),
      };
    case 'claude-address':
      return {
        kind: 'claude-address',
        answers: directive.id,
        ...(await claudeAddressBehind(directive.accessToken)),
      };

    default: {
      const unknownLook: never = directive;

      throw new Error(
        `the engine child heard a look kind it does not know: ${kindOf(unknownLook)}`,
      );
    }
  }
}

async function answerFor(
  runtime: EngineRuntime,
  fetchLike: typeof fetch,
  directive: EngineDirective,
): Promise<unknown> {
  if (directive.kind === 'start') {
    return {
      kind: 'state',
      answers: directive.id,
      slug: directive.gateway.slug,
      state: await runtime.start(directive.gateway),
    };
  }

  if (directive.kind === 'stop') {
    return {
      kind: 'state',
      answers: directive.id,
      slug: directive.slug,
      state: await runtime.stop(directive.slug),
    };
  }

  return lookAnswerFor(fetchLike, directive);
}

async function reportBack(
  parentPort: ParentPort,
  runtime: EngineRuntime,
  fetchLike: typeof fetch,
  directive: EngineDirective,
): Promise<void> {
  parentPort.postMessage(engineReportSchema.parse(await answerFor(runtime, fetchLike, directive)));
}

/**
 * Tells the parent what one finished request came to, the moment it finished.
 *
 * @summary One word per attempt matches the spend request the same attempt already sent, so the lane
 * carries no more traffic than serving itself does, and the parent is free to hold the latest word
 * per route node rather than replay every one of them at a screen. A word the parent cannot be told
 * is written down and dropped, because the caller is owed its answer either way.
 */
function notingTraffic(parentPort: ParentPort): NoteTraffic {
  return (slug, virtualModel, routeNode, request) => {
    try {
      parentPort.postMessage(
        engineTrafficReportSchema.parse({
          kind: 'traffic',
          slug,
          virtualModel,
          routeNode,
          request,
        }),
      );
    } catch (failure) {
      console.error(`The engine child dropped a traffic word for "${slug}".`, failure);
    }
  };
}

function tellingTheParentEveryLogRow(parentPort: ParentPort): void {
  subscribeToLogRows((row) => {
    try {
      parentPort.postMessage(engineLogReportSchema.parse({ kind: 'log', row }));
    } catch (failure) {
      console.error(`The engine child dropped a log row for "${row.gateway}".`, failure);
    }
  });
}

/**
 * Tells the parent what one router is holding, the moment a conversation earns or loses a branch.
 *
 * @summary The address the store counts under is the address the report files under, so the parent
 * places a tally without knowing anything about how a branch is decided. A tally the parent cannot
 * be told is written down and dropped, because the request that moved it is owed its answer either
 * way and a count is only ever the newest word.
 */
function tellingTheParentEveryBranchTally(parentPort: ParentPort): void {
  subscribeToBranchPinTallies(({ address, pinned }) => {
    try {
      parentPort.postMessage(
        engineBranchPinReportSchema.parse({ kind: 'branch-pins', ...address, pinned }),
      );
    } catch (failure) {
      console.error(`The engine child dropped a branch tally for "${address.slug}".`, failure);
    }
  });
}

/**
 * Tells the parent while one router waits on its judge, so a tie can pulse for exactly that long.
 *
 * @summary The report carries a count and a place and nothing else, which is what lets it cross a
 * lane a screen reads without ever carrying a caller's words. A dropped report only costs one frame
 * of a pulse, so it is logged and stepped over rather than failing the request that raised it.
 */
function tellingTheParentEveryJudging(parentPort: ParentPort): void {
  subscribeToJudging(({ address, judging }) => {
    try {
      parentPort.postMessage(
        engineJudgingReportSchema.parse({ kind: 'judging', ...address, judging }),
      );
    } catch (failure) {
      console.error(`The engine child dropped a judging signal for "${address.slug}".`, failure);
    }
  });
}

/**
 * Tells the parent when one route node stands back up, the moment it is told to stand down.
 *
 * @summary The address the store cools under is the address the report files under, so the parent
 * places a stand-down without knowing anything about what refused the call. A moment the parent
 * cannot be told is written down and dropped, because the request that earned the stand-down is
 * owed its answer either way and the next refusal will say the window again.
 */
function tellingTheParentEveryCooldown(parentPort: ParentPort): void {
  subscribeToCooldowns(({ address, coolUntilMs }) => {
    try {
      parentPort.postMessage(
        engineCooldownReportSchema.parse({ kind: 'cooldown', ...address, coolUntilMs }),
      );
    } catch (failure) {
      console.error(`The engine child dropped a cooldown for "${address.slug}".`, failure);
    }
  });
}

export function attachEngineChild(
  parentPort: ParentPort,
  openListeners: OpenListeners,
  fetchLike: typeof fetch = globalThis.fetch,
  subscriptionOverrides?: Omit<SubscriptionRuntime, 'persist'>,
  plugins?: PluginHost,
): void {
  const spendLane = openSpendLane(parentPort);
  const credentialLane = openCredentialUpdateLane(parentPort);
  const subscriptions = subscriptionOverrides
    ? { ...subscriptionOverrides, persist: credentialLane.persist }
    : subscriptionRuntime(credentialLane.persist);
  const runtime = createEngineRuntime(
    openListeners,
    spendLane.grantFor,
    fetchLike,
    subscriptions,
    plugins,
    notingTraffic(parentPort),
  );

  tellingTheParentEveryLogRow(parentPort);
  tellingTheParentEveryBranchTally(parentPort);
  tellingTheParentEveryCooldown(parentPort);
  tellingTheParentEveryJudging(parentPort);

  parentPort.on('message', (messageEvent) => {
    if (spendLane.settle(messageEvent.data) || credentialLane.settle(messageEvent.data)) {
      return;
    }

    const directive = engineDirectiveSchema.safeParse(messageEvent.data);

    if (!directive.success) {
      console.error(
        'The engine child refused a directive it could not read.',
        sanitizedRefusal(directive.error.issues),
      );

      return;
    }

    reportBack(parentPort, runtime, fetchLike, directive.data).catch((failure: unknown) => {
      console.error('The engine child could not answer a directive.', failure);
    });
  });
}
