import type {
  EngineStates,
  GatewayBranchPins,
  GatewayCooldowns,
  GatewayJudging,
  GatewayEngineState,
  GatewayTraffic,
  IpcRequest,
  RecomposeIpc,
  RecomposeIpcEvents,
} from '@recompose/contracts';
import type { QueryClient } from '@tanstack/react-query';

import {
  queryOptions,
  skipToken,
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { unwrapIpcResult, withRefusal } from './ipc-result';

const STOPPED: GatewayEngineState = { status: 'stopped' };

const NOTHING_HAS_FLOWED: GatewayTraffic = {};

const NOTHING_IS_PINNED: GatewayBranchPins = {};

const NOTHING_STANDS_DOWN: GatewayCooldowns = {};

const NOBODY_IS_JUDGING: GatewayJudging = {};

/**
 * The shape of every ask that tells main a window has bound and wants a reading again.
 *
 * @summary The answer carries nothing: the reading arrives on the push the binding already
 * listens to. One type serves both asks, which is what keeps the request log and the traffic
 * from growing two shapes for one act.
 */
export type ResendAsk = RecomposeIpc['engine:replay-traffic'];

/**
 * Asks main to send a reading again, complaining rather than throwing when the ask breaks.
 *
 * @summary A renderer binds fresh on every reload and on every new window, holding nothing, while
 * main sits on the whole reading. A broken ask leaves the window on what it has rather than
 * tearing the binding down, because a screen that missed one backfill still reads every push
 * after it.
 */
export function askMainToResend(ask: ResendAsk, unanswered: string): void {
  const complain = (reason: unknown): void => {
    console.error(unanswered, reason);
  };

  void ask().then((answered) => {
    if (!answered.ok) {
      complain(answered.error);
    }
  }, complain);
}

export const engineStatesQueryOptions = queryOptions({
  queryKey: ['engine-states'],
  queryFn: async () => unwrapIpcResult(await window.recompose['engine:states']()),
});

/**
 * What the snapshot says about one gateway.
 *
 * @summary The snapshot carries an entry only for a gateway the engine has touched, so a
 * gateway missing from it has never served and reads as stopped.
 */
export function gatewayStateIn(states: EngineStates, slug: string): GatewayEngineState {
  return states[slug] ?? STOPPED;
}

/**
 * Points the lifecycle push at the query cache and hands back the way to stop listening.
 *
 * @summary Every push carries the whole snapshot, so writing it straight into the cache leaves
 * nothing to reconcile and no ordering rule to get wrong.
 */
export function bindEngineStatesToCache(queryClient: QueryClient): () => void {
  return window.recomposeEvents['engine:state']((states) => {
    queryClient.setQueryData(engineStatesQueryOptions.queryKey, states);
  });
}

/**
 * What the last request through each virtual model came to.
 *
 * @summary Traffic reaches the renderer only by push, so the query starts on an empty snapshot and
 * a gateway nothing has flowed through yet reads as nothing rather than as loading.
 */
export const engineTrafficQueryOptions = queryOptions({
  queryKey: ['engine-traffic'],
  queryFn: skipToken,
  initialData: NOTHING_HAS_FLOWED,
});

const TRAFFIC_UNANSWERED =
  'recompose could not ask for the requests a gateway is answering right now.';

/**
 * Points the traffic push at the query cache and hands back the way to stop listening.
 *
 * @summary Every push carries the whole snapshot, so writing it straight into the cache leaves
 * nothing to reconcile and no ordering rule to get wrong.
 *
 * Binding also asks main to send the snapshot again, because main speaks only when an outcome
 * changes it. A request already live when a window binds would otherwise hold its cable dark
 * until it settled, which a streaming answer can leave for many seconds, and a reload and a
 * second window each start on an empty snapshot while main still holds the whole one.
 */
export function bindEngineTrafficToCache(
  queryClient: QueryClient,
  subscribe: RecomposeIpcEvents['engine:traffic'] = window.recomposeEvents['engine:traffic'],
  ask: ResendAsk = window.recompose['engine:replay-traffic'],
): () => void {
  const letGo = subscribe((traffic) => {
    queryClient.setQueryData(engineTrafficQueryOptions.queryKey, traffic);
  });

  askMainToResend(ask, TRAFFIC_UNANSWERED);

  return letGo;
}

/**
 * How many conversations each conditional router is holding, per branch.
 *
 * @summary The counts reach the renderer only by push, so the query starts on an empty snapshot and
 * a router nothing has judged through yet reads as nothing rather than as loading. They are held
 * apart from traffic because a cable and a branch count move on entirely different occasions, and
 * one snapshot carrying both would repaint each at the other's pace.
 */
export const engineBranchPinsQueryOptions = queryOptions({
  queryKey: ['engine-branch-pins'],
  queryFn: skipToken,
  initialData: NOTHING_IS_PINNED,
});

/**
 * Points the pin push at the query cache and hands back the way to stop listening.
 *
 * @summary Every push carries the whole snapshot, so writing it straight into the cache leaves
 * nothing to reconcile and no ordering rule to get wrong.
 */
export function bindEngineBranchPinsToCache(
  queryClient: QueryClient,
  subscribe: RecomposeIpcEvents['engine:pins'] = window.recomposeEvents['engine:pins'],
): () => void {
  return subscribe((pinning) => {
    queryClient.setQueryData(engineBranchPinsQueryOptions.queryKey, pinning);
  });
}

/**
 * When each route node standing down is ready again.
 *
 * @summary The moments reach the renderer only by push, so the query starts on an empty snapshot
 * and a gateway nothing has refused reads as nothing rather than as loading. They are held apart
 * from traffic and from the pins because a stand-down moves on a provider's refusal rather than on
 * a request answering, and one snapshot carrying all three would repaint each at the others' pace.
 */
export const engineCooldownsQueryOptions = queryOptions({
  queryKey: ['engine-cooldowns'],
  queryFn: skipToken,
  initialData: NOTHING_STANDS_DOWN,
});

/**
 * Points the cooldown push at the query cache and hands back the way to stop listening.
 *
 * @summary Every push carries the whole snapshot, so writing it straight into the cache leaves
 * nothing to reconcile and no ordering rule to get wrong.
 */
export function bindEngineCooldownsToCache(
  queryClient: QueryClient,
  subscribe: RecomposeIpcEvents['engine:cooldowns'] = window.recomposeEvents['engine:cooldowns'],
): () => void {
  return subscribe((cooling) => {
    queryClient.setQueryData(engineCooldownsQueryOptions.queryKey, cooling);
  });
}

/**
 * How many classifications each conditional router is waiting on right now.
 *
 * @summary Held apart from the cooldowns and the pins because it moves on a judge call opening and
 * closing rather than on anything being stored, and a snapshot carrying all three would repaint
 * each at the others' pace. It starts empty, so a canvas nothing is judging on reads as still.
 */
export const engineJudgingQueryOptions = queryOptions({
  queryKey: ['engine-judging'],
  queryFn: skipToken,
  initialData: NOBODY_IS_JUDGING,
});

/** Points the judging push at the query cache and hands back the way to stop listening. */
export function bindEngineJudgingToCache(
  queryClient: QueryClient,
  subscribe: RecomposeIpcEvents['engine:judging'] = window.recomposeEvents['engine:judging'],
): () => void {
  return subscribe((judging) => {
    queryClient.setQueryData(engineJudgingQueryOptions.queryKey, judging);
  });
}

/**
 * The key every start and stop rides under, so a window can read that one is standing.
 *
 * @summary The controls that start and stop a gateway sit in the toolbar and in the sidebar, so a
 * screen that has to know whether a person asked for what just happened cannot reach the act
 * through a prop. Tagging the act is what lets any screen read it without owning the control.
 */
const GATEWAY_LIFECYCLE_ACT = ['engine-lifecycle'] as const;

/**
 * Whether a gateway is being started or stopped from this window right now.
 *
 * @summary A gateway a person stopped and a gateway that went down on its own leave the very same
 * word in the engine snapshot, and neither carries a reason. This is what tells them apart, so a
 * screen can explain a silence without explaining a decision back to the person who made it.
 */
export function useGatewayLifecycleAsked(): boolean {
  return useIsMutating({ mutationKey: GATEWAY_LIFECYCLE_ACT }) > 0;
}

function useLifecycleMutation(
  reach: (request: IpcRequest<'engine:start'>) => Promise<GatewayEngineState>,
) {
  const queryClient = useQueryClient();

  return withRefusal(
    useMutation({
      mutationKey: GATEWAY_LIFECYCLE_ACT,
      mutationFn: reach,
      onSuccess: (state, request) => {
        queryClient.setQueryData(engineStatesQueryOptions.queryKey, (states?: EngineStates) => ({
          ...states,
          [request.slug]: state,
        }));
      },
    }),
  );
}

/** Starts one gateway, and carries the sentence explaining a refusal in `refusal`. */
export function useStartGateway() {
  return useLifecycleMutation(async (request) =>
    unwrapIpcResult(await window.recompose['engine:start'](request)),
  );
}

/** Stops one gateway, and carries the sentence explaining a refusal in `refusal`. */
export function useStopGateway() {
  return useLifecycleMutation(async (request) =>
    unwrapIpcResult(await window.recompose['engine:stop'](request)),
  );
}
