import { useEffect, useState } from 'react';

import type { ComposedCanvas } from './use-gateway-canvas';

import { closeInspector, toggleLogsDrawer } from '../../../../shared/lib';
import { COPY_OUTCOME_WORDING } from '../../../../shared/ui';

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
