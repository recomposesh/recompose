import {
  type EngineDirective,
  engineDirectiveSchema,
  engineLogReportSchema,
  engineReportSchema,
  engineTrafficReportSchema,
  type KeyProviderId,
} from '@recompose/contracts';

import type { SubscriptionRuntime } from './gateway-proxy';
import type { ParentPort } from './parent-port';
import type { PluginHost } from './plugin-host';

import { openCredentialUpdateLane, openSpendLane } from './engine-child-lanes';
import { createEngineRuntime, type EngineRuntime, type OpenListeners } from './engine-runtime';
import { subscriptionRuntime } from './gateway-proxy';
import { type NoteTraffic, subscribeToLogRows } from './gateway-traffic';
import { loopbackOverrideOrNull } from './loopback-override';
import { firstPartyProbeOrigins, probeKey } from './provider/key-probe';
import { listProviderModels } from './provider/model-list';
import { probeRuntime } from './provider/runtime-probe';

function probeOriginFor(provider: KeyProviderId): string {
  return (
    loopbackOverrideOrNull('RECOMPOSE_PROBE_ORIGIN', process.env['RECOMPOSE_PROBE_ORIGIN']) ??
    firstPartyProbeOrigins[provider]
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

type LookDirective = Extract<EngineDirective, { kind: 'probe' | 'probe-runtime' | 'list-models' }>;

async function lookAnswerFor(fetchLike: typeof fetch, directive: LookDirective): Promise<unknown> {
  switch (directive.kind) {
    case 'probe':
      return {
        kind: 'key-check',
        answers: directive.id,
        ...(await probeKey(
          fetchLike,
          directive.provider,
          directive.key,
          probeOriginFor(directive.provider),
        )),
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

  subscribeToLogRows((row) => {
    try {
      parentPort.postMessage(engineLogReportSchema.parse({ kind: 'log', row }));
    } catch (failure) {
      console.error(`The engine child dropped a log row for "${row.gateway}".`, failure);
    }
  });

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
