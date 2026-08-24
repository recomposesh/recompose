import { z } from 'zod';

/** The modifier a platform holds its shortcuts under, which every printed hint conjugates. */
export const shortcutKeySchema = z.enum(['command', 'control']);

export type ShortcutKey = z.infer<typeof shortcutKeySchema>;

const chordPrefixes: Record<ShortcutKey, string> = {
  command: '⌘',
  control: 'Ctrl',
};

/**
 * The words a hint prints for one chord.
 *
 * @summary The accelerator a menu registers spells the same chord as `CmdOrCtrl`, which Electron
 * conjugates itself. A hint painted on a surface has no such conjugation, so it reads this table
 * rather than a glyph copied into the copy.
 */
export function chordLabelFor(shortcutKey: ShortcutKey, key: string): string {
  return `${chordPrefixes[shortcutKey]} ${key}`;
}
