import { fn } from 'storybook/test';

import type { OptionGroup } from '../ui/option-list/option-list';

/** The args every picker story opens on, named once so the two picker stories cannot drift. */
export function pickerMetaArgs(accounts: readonly OptionGroup[]) {
  return {
    stage: { step: 'account' as const },
    groups: accounts,
    refusal: undefined,
    onDismiss: fn(),
    onPickAccount: fn(),
    onPickProviderModel: fn(),
    onSelectDifferentProvider: fn(),
  };
}
