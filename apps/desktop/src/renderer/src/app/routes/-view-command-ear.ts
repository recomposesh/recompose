import { useEffect } from 'react';

import { setupReopened } from '../../pages/onboarding';
import {
  hideSidebar,
  inspectorOpen,
  modalStanding,
  showSidebar,
  sidebarHidden,
  subscribeToInspectorVisibility,
  setupSurfaceStanding,
  subscribeToModalStanding,
  subscribeToSetupSurface,
  subscribeToSidebarVisibility,
  toggleInspector,
} from '../../shared/lib';

function reportSurfaceToggles(): void {
  void window.recompose['system:surface-toggles']({
    sidebar: !sidebarHidden(),
    inspector: inspectorOpen(),
    modal: modalStanding(),
    setup: setupSurfaceStanding(),
  });
}

function toggledSidebar(): void {
  if (sidebarHidden()) {
    showSidebar();

    return;
  }

  hideSidebar();
}

/**
 * The root ear that answers the View menu's toggles and reports the surface snapshot back.
 *
 * @summary It renders nothing: the menu is the control and the stores are the effect. The report
 * rides the stores' own subscribers, the one seam every writer passes, so the Escape path, the
 * toolbar, and a route departure keep the menu ticks honest without the menu ever asking. One
 * report on mount is what lets the ticks start from the screen rather than from a guess.
 */
export function ViewCommandEar(): null {
  useEffect(
    () =>
      window.recomposeEvents['view:command']((command) => {
        if (command === 'toggle-sidebar') {
          toggledSidebar();

          return;
        }

        if (command === 'open-setup') {
          setupReopened();

          return;
        }

        toggleInspector();
      }),
    [],
  );

  useEffect(() => {
    const disposers = [
      subscribeToSidebarVisibility(reportSurfaceToggles),
      subscribeToInspectorVisibility(reportSurfaceToggles),
      subscribeToModalStanding(reportSurfaceToggles),
      subscribeToSetupSurface(reportSurfaceToggles),
    ];

    reportSurfaceToggles();

    return () => {
      for (const dispose of disposers) {
        dispose();
      }
    };
  }, []);

  return null;
}
