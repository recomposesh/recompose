import { useEffect, useState } from 'react';

/**
 * How long a panel takes to arrive and to leave, which its reveal utilities paint in CSS.
 *
 * @summary The pair has to agree: a panel is held on screen for exactly as long as its leaving
 * animation runs, so shortening one without the other either cuts the motion off or leaves a panel
 * standing after it finished.
 */
const PANEL_MOTION_MS = 150;

/** Whether this machine welcomes motion, which decides if there is an exit to wait for at all. */
function motionWelcome(): boolean {
  return window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

/**
 * Whether a panel belongs on screen, holding it there while it leaves.
 *
 * @summary An element that unmounts the instant its state flips never plays an exit, so the panel
 * opens with motion and vanishes with a cut. This keeps it mounted for the length of that exit and
 * drops it after, which makes closing read as the reverse of opening rather than a glitch.
 */
export function usePanelReveal(open: boolean) {
  const [leaving, setLeaving] = useState(false);
  const [stood, setStood] = useState(open);

  if (open !== stood) {
    setStood(open);
    setLeaving(!open && motionWelcome());
  }

  useEffect(() => {
    if (!leaving) {
      return undefined;
    }

    const settling = setTimeout(() => {
      setLeaving(false);
    }, PANEL_MOTION_MS);

    return () => {
      clearTimeout(settling);
    };
  }, [leaving]);

  return { rendered: open || leaving, leaving };
}
