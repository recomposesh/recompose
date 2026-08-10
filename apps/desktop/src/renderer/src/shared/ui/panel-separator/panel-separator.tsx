import type { KeyboardEvent, PointerEvent, RefObject } from 'react';

import { useEffect, useRef } from 'react';

import type { PanelBounds } from '../../lib';

import { draggedPanel, restoredPanel, steppedPanel } from '../../lib';

type PanelSeparatorProps = {
  /** What the separator sizes, spoken as its accessible name. */
  label: string;
  /** How far the panel stands along the axis, and how far it comes back once a shut one returns. */
  width: number;
  /** How far it may stand, and how far a drag has to go to shut it or bring it back. */
  bounds: PanelBounds;
  /** Which way the panel sizes: across the column beside it, or down the column above it. */
  axis?: 'inline' | 'block';
  /** Which edge of the panel this separator is, which decides which way a drag grows it. */
  panelEdge: 'leading' | 'trailing';
  /** Whether the panel has been put away, leaving this border as the way back to it. */
  shut?: boolean;
  /** Receives every size the drag or a key settles on. */
  onResize: (width: number) => void;
  /** Receives the ask to shut the panel, which a drag well past the smallest size makes. */
  onCollapse: () => void;
  /** Receives the ask to bring a shut panel back, which a drag out of it makes. */
  onRestore: () => void;
  /** Receives the news that the gesture is over, so the size it left can be written down. */
  onSettled: () => void;
};

type PointerPlace = { clientX: number; clientY: number };

type Axis = {
  orientation: 'vertical' | 'horizontal';
  towardStart: string;
  towardEnd: string;
  at: (place: PointerPlace) => number;
  strip: string;
};

const axes: Record<NonNullable<PanelSeparatorProps['axis']>, Axis> = {
  inline: {
    orientation: 'vertical',
    towardStart: 'ArrowLeft',
    towardEnd: 'ArrowRight',
    at: (place) => place.clientX,
    strip: '-mx-1 w-2 cursor-ew-resize',
  },
  block: {
    orientation: 'horizontal',
    towardStart: 'ArrowUp',
    towardEnd: 'ArrowDown',
    at: (place) => place.clientY,
    strip: '-my-1 h-2 cursor-ns-resize',
  },
};

type Settling = {
  bounds: PanelBounds;
  onResize: (width: number) => void;
  onCollapse: () => void;
};

type Sizing = Settling & { width: number; toward: number; axis: Axis };

function arrowAlong(key: string, axis: Axis): number | undefined {
  if (key === axis.towardStart) {
    return -1;
  }

  if (key === axis.towardEnd) {
    return 1;
  }

  return undefined;
}

const reaches: Record<string, (bounds: PanelBounds) => number> = {
  Home: (bounds) => bounds.min,
  End: (bounds) => bounds.max,
};

function sizedByKey(key: string, sizing: Sizing): boolean {
  const arrow = arrowAlong(key, sizing.axis);

  if (arrow !== undefined) {
    sizing.onResize(steppedPanel(sizing.width, arrow * sizing.toward, sizing.bounds));

    return true;
  }

  const reach = reaches[key];

  if (reach !== undefined) {
    sizing.onResize(reach(sizing.bounds));

    return true;
  }

  if (key === 'Enter') {
    sizing.onCollapse();

    return true;
  }

  return false;
}

function restoredByKey(key: string, sizing: Sizing, onRestore: () => void): boolean {
  const grows = sizing.toward === 1 ? sizing.axis.towardEnd : sizing.axis.towardStart;

  if (key === grows || key === 'Enter') {
    onRestore();

    return true;
  }

  return false;
}

function settle(asked: number, settling: Settling): 'sized' | 'collapsed' {
  const standing = draggedPanel(asked, settling.bounds);

  if (standing.standing === 'collapsed') {
    settling.onCollapse();

    return 'collapsed';
  }

  settling.onResize(standing.width);

  return 'sized';
}

type Watching = {
  pointer: number;
  askedFrom: (place: PointerPlace) => number;
  shut: boolean;
  settling: Settling;
  onRestore: () => void;
  onSettled: () => void;
};

function useEndedOnUnmount(dragging: RefObject<(() => void) | undefined>): void {
  useEffect(
    () => () => {
      dragging.current?.();
    },
    [dragging],
  );
}

function watchTheDrag(watching: Watching): () => void {
  const answer = (asked: number): boolean => {
    if (!watching.shut) {
      return settle(asked, watching.settling) === 'collapsed';
    }

    if (!restoredPanel(asked, watching.settling.bounds)) {
      return false;
    }

    watching.onRestore();

    return true;
  };

  const onMove = (moved: globalThis.PointerEvent): void => {
    if (moved.pointerId === watching.pointer && answer(watching.askedFrom(moved))) {
      stopWatching();
    }
  };

  const onEnd = (ended: globalThis.PointerEvent): void => {
    if (ended.pointerId === watching.pointer) {
      stopWatching();
    }
  };

  function stopWatching(): void {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
    watching.onSettled();
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onEnd);
  window.addEventListener('pointercancel', onEnd);

  return stopWatching;
}

/**
 * The border between a panel and the surface it sits against, which a person drags to size it.
 *
 * @summary Reach for it on any panel a person should be able to size, whether the panel sits beside
 * the surface or under it. Dragging sizes the panel between the sizes its content reads at, dragging
 * well past the smallest one shuts it, and dragging back out of a shut one returns it at the size
 * its owner last chose, so the border stays the way back to a panel that has gone rather than a
 * strip that does nothing. It carries the window-splitter semantics whole, so the arrows of its own
 * axis size it, Home and End reach the bounds, and Enter shuts it and brings it back, because a
 * border only a pointer can reach is out of reach for anyone without one. Shutting or restoring ends
 * the drag, since a pointer traveling on has nothing left to say about a panel that already
 * answered.
 */
export function PanelSeparator({
  label,
  width,
  bounds,
  axis = 'inline',
  panelEdge,
  shut = false,
  onResize,
  onCollapse,
  onRestore,
  onSettled,
}: PanelSeparatorProps) {
  const dragging = useRef<(() => void) | undefined>(undefined);
  const along = axes[axis];
  const toward = panelEdge === 'trailing' ? 1 : -1;
  const standingSize = shut ? 0 : width;

  useEndedOnUnmount(dragging);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const sizing = { width, bounds, toward, axis: along, onResize, onCollapse };

    if (shut ? restoredByKey(event.key, sizing, onRestore) : sizedByKey(event.key, sizing)) {
      event.preventDefault();
      onSettled();
    }
  };

  return (
    <div
      aria-label={label}
      aria-orientation={along.orientation}
      aria-valuemax={bounds.max}
      aria-valuemin={0}
      aria-valuenow={standingSize}
      className={`app-no-drag relative z-20 shrink-0 focus-ring ${along.strip}`}
      data-panel-control=""
      onKeyDown={onKeyDown}
      onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
        const from = along.at(event);

        dragging.current = watchTheDrag({
          pointer: event.pointerId,
          askedFrom: (place) => standingSize + toward * (along.at(place) - from),
          shut,
          settling: { bounds, onResize, onCollapse },
          onRestore,
          onSettled,
        });
      }}
      role="separator"
      tabIndex={0}
    />
  );
}
