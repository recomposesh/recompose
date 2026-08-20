import type {
  EngineStates,
  GatewayBranchPins,
  GatewayCooldowns,
  GatewayJudging,
  GatewayTraffic,
  LogBatch,
  LogRow,
} from '@recompose/contracts';

type PushLine<Payload> = {
  forget: () => void;
  listen: (listener: (payload: Payload) => void) => () => void;
  emit: (payload: Payload) => void;
};

/**
 * One push the main process would make, standing on its own so a spec can drive it.
 *
 * @summary Every push works the same way, so the knowledge of how one behaves lives here once and
 * each line is only its payload and its name.
 */
export function aPushLine<Payload>(): PushLine<Payload> {
  const listeners = new Set<(payload: Payload) => void>();

  return {
    forget: () => {
      listeners.clear();
    },
    listen: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    emit: (payload) => {
      for (const listener of listeners) {
        listener(payload);
      }
    },
  };
}

const engineStateLine = aPushLine<EngineStates>();

const engineTrafficLine = aPushLine<GatewayTraffic>();

const engineLogsLine = aPushLine<LogBatch>();

export function forgetEngineStateListeners(): void {
  engineStateLine.forget();
}

export function listenForEngineStates(listener: (states: EngineStates) => void): () => void {
  return engineStateLine.listen(listener);
}

/**
 * Pushes a lifecycle snapshot at everything listening, the way the main process would.
 *
 * @summary Reach for it in a story or a spec that has to show state arriving on its own, with
 * nothing on screen having asked for it.
 */
export function emitEngineStates(states: EngineStates): void {
  engineStateLine.emit(states);
}

export function forgetEngineTrafficListeners(): void {
  engineTrafficLine.forget();
}

export function listenForEngineTraffic(listener: (traffic: GatewayTraffic) => void): () => void {
  return engineTrafficLine.listen(listener);
}

/**
 * Pushes a traffic snapshot at everything listening, the way the main process would.
 *
 * @summary Reach for it in a story or a spec that has to show a cable answering a request nobody
 * on screen asked about.
 */
export function emitEngineTraffic(traffic: GatewayTraffic): void {
  engineTrafficLine.emit(traffic);
}

const engineBranchPinsLine = aPushLine<GatewayBranchPins>();

export function forgetEngineBranchPinListeners(): void {
  engineBranchPinsLine.forget();
}

export function listenForEngineBranchPins(
  listener: (pinned: GatewayBranchPins) => void,
): () => void {
  return engineBranchPinsLine.listen(listener);
}

/**
 * Pushes a pin snapshot at everything listening, the way the main process would.
 *
 * @summary Reach for it in a story or a spec that has to show branch rows counting conversations
 * nobody on screen started.
 */
export function emitEngineBranchPins(pinned: GatewayBranchPins): void {
  engineBranchPinsLine.emit(pinned);
}

const engineCooldownsLine = aPushLine<GatewayCooldowns>();

export function forgetEngineCooldownListeners(): void {
  engineCooldownsLine.forget();
}

export function listenForEngineCooldowns(
  listener: (cooling: GatewayCooldowns) => void,
): () => void {
  return engineCooldownsLine.listen(listener);
}

/**
 * Pushes a cooldown snapshot at everything listening, the way the main process would.
 *
 * @summary Reach for it in a story or a spec that has to stand a judge down without a provider
 * refusing anything.
 */
export function emitEngineCooldowns(cooling: GatewayCooldowns): void {
  engineCooldownsLine.emit(cooling);
}

const servedRows: LogRow[] = [];

/**
 * Empties the logs line, both who is listening and the history a replay would send.
 *
 * @summary The retained rows go with the listeners, because a scenario that reset the line and then
 * bound would otherwise read the rows the scenario before it emitted.
 */
export function forgetEngineLogsListeners(): void {
  engineLogsLine.forget();
  servedRows.length = 0;
}

export function listenForEngineLogs(listener: (batch: LogBatch) => void): () => void {
  return engineLogsLine.listen(listener);
}

/**
 * Pushes a run of request rows at everything listening, the way the main process would.
 *
 * @summary Reach for it in a story or a spec that has to show the drawer filling on its own, and
 * push a `backfill` run to stand for what a fresh subscriber missed and an `append` run for what
 * the gateway has served since.
 */
export function emitEngineLogs(batch: LogBatch): void {
  servedRows.push(...batch.rows);
  engineLogsLine.emit(batch);
}

/**
 * Sends every row emitted so far again, the way the desk in main answers a renderer that just bound.
 *
 * @summary A story can seed rows before anything mounts and still have them arrive, because the
 * binding asks for the history rather than waiting for the next request to be served.
 */
export function replayEngineLogs(): void {
  if (servedRows.length === 0) {
    return;
  }

  engineLogsLine.emit({ kind: 'backfill', rows: [...servedRows] });
}

const engineJudgingLine = aPushLine<GatewayJudging>();

export function forgetEngineJudgingListeners(): void {
  engineJudgingLine.forget();
}

export function listenForEngineJudging(listener: (judging: GatewayJudging) => void): () => void {
  return engineJudgingLine.listen(listener);
}
