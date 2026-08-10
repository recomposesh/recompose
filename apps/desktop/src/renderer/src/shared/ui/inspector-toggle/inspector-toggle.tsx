import { useSyncExternalStore } from 'react';

import { inspectorOpen, subscribeToInspectorVisibility, toggleInspector } from '../../lib';
import { Icon } from '../icon/icon';
import { toolbarShape } from '../toolbar-shape';

const STATES =
  'hover:bg-surface-hover active:bg-surface-pressed aria-expanded:bg-surface-pressed aria-expanded:text-ink';

type InspectorToggleProps = {
  /** Whether the control stands alone in the strip or inside a button group, as the others do. */
  where: keyof typeof toolbarShape;
};

/**
 * The control that opens the selected gateway's inspector and puts it away.
 *
 * @summary It answers the same state the gateway node does, so the two can never disagree about
 * whether the drawer stands, and pressing either one moves both. It lives only on the gateway
 * detail surface, the one place an inspector exists to open.
 */
export function InspectorToggle({ where }: InspectorToggleProps) {
  const open = useSyncExternalStore(subscribeToInspectorVisibility, inspectorOpen);

  return (
    <button
      data-panel-control=""
      aria-expanded={open}
      aria-label="Inspector"
      className={`app-no-drag flex items-center justify-center text-ink-secondary focus-ring ${STATES} ${toolbarShape[where]}`}
      onClick={toggleInspector}
      type="button"
    >
      <Icon className="size-4" name="panel-right" />
    </button>
  );
}
