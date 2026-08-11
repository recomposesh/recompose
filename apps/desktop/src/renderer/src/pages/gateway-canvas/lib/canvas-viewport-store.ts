import type { Viewport } from '@xyflow/react';

const VIEWPORT_KEY = 'recompose.canvas.viewport';

function keyFor(slug: string): string {
  return `${VIEWPORT_KEY}.${slug}`;
}

function isSeatNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isZoomNumber(value: unknown): value is number {
  return isSeatNumber(value) && value > 0;
}

function holdsViewportAxes(parsed: unknown): parsed is Record<'x' | 'y' | 'zoom', unknown> {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'x' in parsed &&
    'y' in parsed &&
    'zoom' in parsed
  );
}

function settledViewport(parsed: unknown): Viewport | undefined {
  if (!holdsViewportAxes(parsed)) {
    return undefined;
  }

  const { x, y, zoom } = parsed;

  return isSeatNumber(x) && isSeatNumber(y) && isZoomNumber(zoom) ? { x, y, zoom } : undefined;
}

function viewportRead(raw: string | null): Viewport | undefined {
  if (raw === null) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    return settledViewport(parsed);
  } catch {
    return undefined;
  }
}

/** Where this gateway's canvas stood when the person left it, or nothing on a first visit. */
export function canvasViewport(slug: string): Viewport | undefined {
  return viewportRead(localStorage.getItem(keyFor(slug)));
}

export function keepCanvasViewport(slug: string, viewport: Viewport): void {
  localStorage.setItem(keyFor(slug), JSON.stringify(viewport));
}

/** Forgets the viewport of a gateway that no longer exists. */
export function dropCanvasViewport(slug: string): void {
  localStorage.removeItem(keyFor(slug));
}
