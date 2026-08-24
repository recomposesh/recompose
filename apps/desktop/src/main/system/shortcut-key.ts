import type { ShortcutKey } from '@recompose/contracts';

export function shortcutKeyFor(platform: NodeJS.Platform): ShortcutKey {
  return platform === 'darwin' ? 'command' : 'control';
}
