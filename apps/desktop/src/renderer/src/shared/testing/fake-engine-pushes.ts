import type { EngineStates, GatewayTraffic, LogBatch } from '@recompose/contracts';

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
function aPushLine<Payload>(): PushLine<Payload> {
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

export function forgetEngineLogsListeners(): void {
  engineLogsLine.forget();
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
  engineLogsLine.emit(batch);
}
