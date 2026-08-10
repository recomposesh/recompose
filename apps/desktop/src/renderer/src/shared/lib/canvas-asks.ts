export type CanvasAsk = 'tidy';

type CanvasAskListener = (ask: CanvasAsk) => void;

const listeners = new Set<CanvasAskListener>();

/** Watches for asks aimed at the canvas, so the stage answers controls that stand outside it. */
export function subscribeToCanvasAsks(listener: CanvasAskListener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Carries one ask to whatever canvas is listening, the way the toolbar reaches the stage. */
export function askTheCanvas(ask: CanvasAsk): void {
  for (const listener of listeners) {
    listener(ask);
  }
}
