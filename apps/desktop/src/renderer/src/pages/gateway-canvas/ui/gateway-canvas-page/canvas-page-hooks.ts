import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import type { ComposedCanvas } from './use-gateway-canvas';

import { useGatewayLifecycleAsked, useStartGateway } from '../../../../shared/api';
import {
  closeInspector,
  inspectorOpen,
  logsDrawerOpen,
  subscribeToInspectorVisibility,
  subscribeToLogsDrawerVisibility,
  subscribeToPanelWidths,
  toggleLogsDrawer,
} from '../../../../shared/lib';
import { COPY_OUTCOME_WORDING } from '../../../../shared/ui';
import { inspectorWidth } from '../../lib/inspector-width';
import { usePanelReveal } from '../../lib/use-inspector-reveal';
import { NOTHING_WATCHED, putAway, watchedAnswering } from './stopped-answering';

/**
 * Turns the Gateway menu's drawer command into the one open state the drawer reads.
 *
 * @summary The command arrives on the channel every Gateway act rides, and the canvas passes this
 * one through untouched, because the drawer stands beside the flow rather than inside it.
 */
export function useLogsCommand(): void {
  useEffect(
    () =>
      window.recomposeEvents['canvas:command']((command) => {
        if (command === 'toggle-logs') {
          toggleLogsDrawer();
        }
      }),
    [],
  );
}

const COPY_CONFIRMATION_LINGERS_MS = 2000;

type CopyOutcome = keyof typeof COPY_OUTCOME_WORDING;

/**
 * Answers the menu's Copy Base URL command and says how the copy went.
 *
 * @summary The sentence it returns is the copy button's own wording, so a menu-driven copy answers
 * a screen reader the way a click does. The confirmation clears after a moment, which is what lets
 * a second copy announce itself again.
 */
export function useMenuCopiesBaseUrl(baseUrl: string | undefined): string | undefined {
  const [outcome, setOutcome] = useState<CopyOutcome | undefined>(undefined);

  useEffect(
    () =>
      window.recomposeEvents['canvas:command']((command) => {
        if (command !== 'copy-base-url' || baseUrl === undefined) {
          return;
        }

        navigator.clipboard
          .writeText(baseUrl)
          .then(() => {
            setOutcome('copied');
          })
          .catch(() => {
            setOutcome('refused');
          });
      }),
    [baseUrl],
  );

  useEffect(() => {
    if (outcome === undefined) {
      return undefined;
    }

    const clearing = setTimeout(() => {
      setOutcome(undefined);
    }, COPY_CONFIRMATION_LINGERS_MS);

    return () => {
      clearTimeout(clearing);
    };
  }, [outcome]);

  return outcome === undefined ? undefined : COPY_OUTCOME_WORDING[outcome];
}

/**
 * Routes the menu's Delete Gateway command into the standing removal question.
 *
 * @summary The command raises the same ask a Delete press raises, so the confirmation, its
 * wording, and what a cancel keeps all stay one flow whichever surface asked.
 */
export function useMenuAsksGatewayRemoval(
  askRemoval: ((nodeId: string) => void) | undefined,
): void {
  useEffect(
    () =>
      window.recomposeEvents['canvas:command']((command) => {
        if (command === 'remove-gateway') {
          askRemoval?.('gateway');
        }
      }),
    [askRemoval],
  );
}

/**
 * Puts the inspector away when the person leaves this gateway, so the next one opens on its canvas.
 *
 * @summary The visibility lives in a store the whole app shares, and a drawer left standing on one
 * gateway would otherwise greet the person on the next. Closing on the way out rather than on the
 * way in is what keeps an entry from painting a drawer just to play its exit.
 */
export function useInspectorPutAwayOnLeave(): void {
  useEffect(() => closeInspector, []);
}

export function useSelectionPutAwayWithInspector(
  open: boolean,
  rendered: boolean,
  canvas: ComposedCanvas | undefined,
): void {
  const selected = canvas?.hasSelection ?? false;
  const clearSelection = canvas?.clearSelection;

  useEffect(() => {
    if (open || rendered) {
      return;
    }

    if (selected) {
      clearSelection?.();
    }
  }, [clearSelection, open, rendered, selected]);
}

/**
 * Tells main whether the drawer stands, so the menu item's check mark reads the truth.
 *
 * @summary The drawer opens from the toolbar, from the menu, and from a drag that collapsed it, so
 * the menu cannot know where it ended up by remembering what it asked for. It hears the answer
 * instead, which is what stops the check mark from disagreeing with the screen.
 */
export function useMenuReadsTheDrawer(open: boolean): void {
  useEffect(() => {
    void window.recompose['system:logs-drawer']({ open });
  }, [open]);
}

/** What the canvas knows about a gateway that went quiet, and the two acts it offers about it. */
export type SilenceOnTheCanvas = {
  stoppedAnswering: boolean;
  putAway: () => void;
  startAgain: () => void;
};

/**
 * Whether this gateway went down with nothing on screen having asked it to, and how to answer that.
 *
 * @summary The watch folds after the commit rather than during it, so what a person reads is a
 * standing the window has already painted rather than a guess made while painting it. It lives on
 * the page rather than in the notice, because the notice only exists once this says so and a
 * surface that raised itself would forget every gateway it had watched each time it left.
 */
export function useStoppedAnswering(slug: string, serving: boolean): SilenceOnTheCanvas {
  const asking = useGatewayLifecycleAsked();
  const [watched, setWatched] = useState(NOTHING_WATCHED);
  const startGateway = useStartGateway();

  useEffect(() => {
    setWatched((held) => watchedAnswering(held, { serving, asking }));
  }, [asking, serving]);

  return {
    stoppedAnswering: watched.stoppedAnswering,
    putAway: useCallback(() => {
      setWatched(putAway);
    }, []),
    startAgain: useCallback(() => {
      startGateway.mutate({ slug });
    }, [slug, startGateway]),
  };
}

/**
 * Every standing the two side panels hold: whether each is asked for, how each is revealing, and
 * how wide the inspector sits.
 *
 * @summary They are read together because the page reads them together: a reveal is folded from
 * the standing beside it, and a page that took one without the other would paint a panel that is
 * open and not revealing, or revealing and not open.
 */
export function usePanelStandings() {
  const shown = useSyncExternalStore(subscribeToInspectorVisibility, inspectorOpen);
  const logsShown = useSyncExternalStore(subscribeToLogsDrawerVisibility, logsDrawerOpen);
  const width = useSyncExternalStore(subscribeToPanelWidths, inspectorWidth);
  const inspector = usePanelReveal(shown);
  const logs = usePanelReveal(logsShown);

  return { shown, logsShown, width, inspector, logs };
}
