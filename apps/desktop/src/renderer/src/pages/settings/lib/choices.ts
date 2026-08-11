import type { Settings } from '@recompose/contracts';

type Choice<Value extends string> = { value: Value; label: string };

export const themeChoices: readonly Choice<Settings['theme']>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];
