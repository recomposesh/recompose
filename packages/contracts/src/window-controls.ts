import { z } from 'zod';

/**
 * Which edge of its own paint the renderer keeps clear for the window controls.
 *
 * @summary The vocabulary names an edge rather than a platform, because the shell has no business
 * knowing which operating system it runs on. macOS draws its controls over the leading edge,
 * Windows draws its caption buttons over the trailing edge, and a platform whose own title bar
 * carries them leaves the renderer nothing to clear.
 */
export const windowControlsSchema = z.enum(['leading', 'trailing', 'none']);

export type WindowControls = z.infer<typeof windowControlsSchema>;
