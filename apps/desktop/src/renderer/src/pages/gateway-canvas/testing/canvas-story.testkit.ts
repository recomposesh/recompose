import { dropCanvasPositions } from '../lib/canvas-position-store';
import { leaveDrafting } from '../lib/use-held-draft';

/**
 * Forgets everything one gateway's canvas remembers between stories.
 *
 * @summary Reach for it in the `beforeEach` of any canvas story. Seats and a half-written draft
 * both outlive a render on purpose, so a story that skipped this would read whatever the story
 * before it left behind and pass or fail on that instead of on its own scenario.
 */
export function forgetCanvasArrangement(slug: string): void {
  dropCanvasPositions(slug);
  leaveDrafting(slug);
}
