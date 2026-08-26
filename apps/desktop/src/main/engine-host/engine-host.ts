import {
  engineReportSchema,
  engineSpendRequestSchema,
  type EngineDirective,
  type EngineReport,
  type EngineStates,
  type GatewayEngineState,
} from '@recompose/contracts';
import { randomUUID } from 'node:crypto';

import type { Waiter } from './directive-waiters';
import type { EngineDesks } from './engine-host-desks';
import type { RestartLane } from './engine-host-restart';
import type { EngineChild, EngineHost, EngineHostDeps } from './engine-host-types';
import type { EngineLooks } from './engine-looks';
import type { SpendGrantFor } from './engine-spend';

import { refuseEveryWaiter } from './directive-waiters';
import { persistRefreshedCredential } from './engine-host-credential-update';
import {
  aDeskHeardIt,
  desksForget,
  desksInterrupted,
  desksServing,
  openEngineDesks,
} from './engine-host-desks';
import { midRestart, restartGateway } from './engine-host-restart';
import {
  answerLook,
  foldEveryLook,
  claudeAddressThroughTheChild,
  listModelsThroughTheChild,
  lookAtTheRuntimeThroughTheChild,
  openEngineLooks,
  probeThroughTheChild,
} from './engine-looks';
import { answerSpendRequest } from './engine-spend';
import { allStopped, foldEngineReport, withGatewayStopped } from './engine-state-ledger';
import { createGatewayOrder } from './gateway-order';

export const DIRECTIVE_TIMEOUT_MS = 5000;

export { PROBE_TIMEOUT_MS } from './engine-looks';
export type { EngineChild, EngineHost, EngineHostDeps } from './engine-host-types';

type StateListener = (states: EngineStates) => void;

type Resident = {
  states: EngineStates;
  child: EngineChild | null;
  spawnChild: () => EngineChild;
  grantFor: SpendGrantFor;
  storeSubscriptionCredential: NonNullable<EngineHostDeps['storeSubscriptionCredential']>;
  subscribers: Set<StateListener>;
  awaitingReport: Map<string, Waiter>;
  looks: EngineLooks;
  desks: EngineDesks;
  /** The gateways a restart is standing over, whose stop is a step rather than an outcome. */
  restarting: Set<string>;
};

function publish(resident: Resident, next: EngineStates): void {
  resident.states = next;

  for (const subscriber of resident.subscribers) {
    subscriber(next);
  }
}

function answerState(resident: Resident, report: Extract<EngineReport, { kind: 'state' }>): void {
  const waiting = resident.awaitingReport.get(report.answers);

  if (waiting === undefined) {
    console.error(
      `recompose dropped a report on the gateway "${report.slug}", because the directive it answers had already been given up on.`,
    );

    return;
  }

  resident.awaitingReport.delete(report.answers);

  if (report.state.status === 'stopped') {
    desksInterrupted(resident.desks, report.slug);
  }

  if (!midRestart(resident.restarting, report)) {
    publish(resident, foldEngineReport(resident.states, report));
  }

  waiting.answer(report.state);
}

function routeReport(resident: Resident, report: EngineReport): void {
  if (report.kind === 'state') {
    answerState(resident, report);

    return;
  }

  answerLook(resident.looks, report);
}

function receiveMessage(resident: Resident, child: EngineChild, message: unknown): void {
  if (aDeskHeardIt(resident.desks, message)) {
    return;
  }

  const report = engineReportSchema.safeParse(message);

  if (report.success) {
    routeReport(resident, report.data);

    return;
  }

  const asked = engineSpendRequestSchema.safeParse(message);

  if (asked.success) {
    answerSpendRequest(child, resident.grantFor, asked.data);

    return;
  }

  if (persistRefreshedCredential(child, resident.storeSubscriptionCredential, message)) {
    return;
  }

  console.error('recompose could not read a report from the engine.', report.error.issues);
}

function receiveExit(resident: Resident, code: number): void {
  const death = new Error(
    `The engine stopped on its own with exit code ${String(code)}, so no gateway is serving.`,
  );

  console.error(death.message);

  for (const slug of Object.keys(resident.states)) {
    desksInterrupted(resident.desks, slug);
  }

  resident.child = null;
  publish(resident, allStopped(Object.keys(resident.states)));
  refuseEveryWaiter(resident.awaitingReport, death);
  foldEveryLook(resident.looks);
}

function runningChild(resident: Resident): EngineChild {
  if (resident.child !== null) {
    return resident.child;
  }

  const spawned = resident.spawnChild();

  spawned.onMessage((message) => {
    receiveMessage(resident, spawned, message);
  });
  spawned.onExit((code) => {
    receiveExit(resident, code);
  });
  resident.child = spawned;

  return spawned;
}

type GatewayDirective = Extract<EngineDirective, { kind: 'start' | 'stop' }>;

function gatewayOf(directive: GatewayDirective): string {
  return directive.kind === 'start' ? directive.gateway.slug : directive.slug;
}

async function sendDirective(
  resident: Resident,
  directive: GatewayDirective,
): Promise<GatewayEngineState> {
  const engine = runningChild(resident);
  const slug = gatewayOf(directive);

  if (directive.kind === 'start') {
    desksServing(resident.desks, directive.gateway);
  }

  return new Promise<GatewayEngineState>((answer, refuse) => {
    const giveUp = setTimeout(() => {
      resident.awaitingReport.delete(directive.id);
      refuse(
        new Error(
          `The engine did not report on the ${directive.kind} of the gateway "${slug}" within ${String(DIRECTIVE_TIMEOUT_MS)}ms.`,
        ),
      );
    }, DIRECTIVE_TIMEOUT_MS);

    resident.awaitingReport.set(directive.id, {
      answer: (state) => {
        clearTimeout(giveUp);
        answer(state);
      },
      refuse: (reason) => {
        clearTimeout(giveUp);
        refuse(reason);
      },
    });

    engine.postMessage(directive);
  });
}

function forgetGateway(resident: Resident, slug: string): void {
  desksForget(resident.desks, slug);

  if (resident.states[slug] === undefined) {
    return;
  }

  const remaining = { ...resident.states };

  delete remaining[slug];
  publish(resident, remaining);
}

function restartLaneFor(resident: Resident): RestartLane {
  return {
    restarting: resident.restarting,
    stop: async (slug) => sendDirective(resident, { kind: 'stop', id: randomUUID(), slug }),
    start: async (gateway) => sendDirective(resident, { kind: 'start', id: randomUUID(), gateway }),
    wentQuiet: (slug) => {
      publish(resident, withGatewayStopped(resident.states, slug));
    },
  };
}

function residentFor(deps: EngineHostDeps): Resident {
  return {
    states: allStopped(deps.knownSlugs),
    child: null,
    spawnChild: deps.spawnChild,
    grantFor: deps.grantFor,
    storeSubscriptionCredential:
      deps.storeSubscriptionCredential ??
      (async () => {
        await Promise.reject(new Error('subscription credential persistence is unavailable'));
      }),
    subscribers: new Set(),
    awaitingReport: new Map(),
    looks: openEngineLooks(),
    desks: openEngineDesks(deps),
    restarting: new Set(),
  };
}

export function createEngineHost(deps: EngineHostDeps): EngineHost {
  const resident = residentFor(deps);
  const restarting = restartLaneFor(resident);
  const inGatewayOrder = createGatewayOrder();
  const child = () => runningChild(resident);

  return {
    start: async (gateway) =>
      inGatewayOrder(gateway.slug, async () =>
        sendDirective(resident, { kind: 'start', id: randomUUID(), gateway }),
      ),
    stop: async (slug) =>
      inGatewayOrder(slug, async () =>
        sendDirective(resident, { kind: 'stop', id: randomUUID(), slug }),
      ),
    restart: async (gateway) =>
      inGatewayOrder(gateway.slug, async () => restartGateway(restarting, gateway)),
    probe: async (origin, custody) => probeThroughTheChild(resident.looks, child, origin, custody),
    probeRuntime: async (address, provider) =>
      lookAtTheRuntimeThroughTheChild(resident.looks, child, address, provider),
    listModels: async (origin, custody) =>
      listModelsThroughTheChild(resident.looks, child, origin, custody),

    claudeAddress: async (accessToken) =>
      (await claudeAddressThroughTheChild(resident.looks, child, accessToken)).address,
    states: () => resident.states,
    retainedLogRows: () => resident.desks.logs.retainedRows(),
    replayLogs: () => {
      resident.desks.logs.backfill();
    },
    replayTraffic: () => {
      resident.desks.traffic.replay();
    },
    forget: (slug) => {
      forgetGateway(resident, slug);
    },
    onStatesChanged: (listener) => {
      resident.subscribers.add(listener);

      return () => {
        resident.subscribers.delete(listener);
      };
    },
    dispose: () => {
      resident.child?.kill();
      resident.child = null;
    },
  };
}
