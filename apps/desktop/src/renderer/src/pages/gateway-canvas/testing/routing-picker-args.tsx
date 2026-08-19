import type { Decorator } from '@storybook/react-vite';

import type { RoutingPickerProps } from '../ui/routing-picker/routing-picker';

/**
 * The providers a picker reading offers, and the answers it is handed.
 *
 * @summary The picker and the fields that compose it both need the whole shape, and a story file
 * that spelled it twice would drift the moment one of them gained a prop. More than one kind and
 * more than one row, because a reading about grouping needs both.
 */
const pickerTargets = [
  {
    heading: 'API keys',
    options: [
      { id: 'k1', name: 'work', mark: 'anthropic' as const },
      { id: 'k2', name: 'personal', mark: 'openai' as const },
    ],
  },
  {
    heading: 'Local runtimes',
    options: [{ id: 'l1', name: 'Ollama', mark: 'ollama' as const, detail: '127.0.0.1:11434' }],
  },
];

/** The judge sub-pick as a draft that has answered nothing about it yet. */
export const unjudged: RoutingPickerProps['judge'] = {
  binding: undefined,
  name: undefined,
  models: [],
  onPickAccount: () => {},
  onPickModel: () => {},
  onSelectDifferentProvider: () => {},
};

export const pickerArgs: RoutingPickerProps = {
  targets: pickerTargets,
  onPickKind: () => {},
  onReopenKind: () => {},
  routerMode: 'failover',
  onRouterModeChange: () => {},
  onReopenRouterMode: () => {},
  routerName: '',
  onRouterNameChange: () => {},
  onPickTarget: () => {},
  onSelectDifferentProvider: () => {},
  models: [],
  providerModel: '',
  onPickModel: () => {},
  judge: unjudged,
};

/**
 * The frame a picker reading stands in, which is the width the drawer gives it.
 *
 * @summary Both readings render the same control, so both need the same room. A picker measured
 * in one width and read in another says nothing about the one a person meets.
 */
export const inTheDrawersColumn: Decorator = (Story) => (
  <div className="mx-auto my-4 w-76 px-3.5">
    <Story />
  </div>
);
