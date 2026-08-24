import { useSyncExternalStore } from 'react';

import {
  logsDrawerOpen,
  subscribeToLogsDrawerVisibility,
  toggleLogsDrawer,
} from '../../../../../shared/lib';
import { InspectorToggle, ToolbarButton } from '../../../../../shared/ui';

const GROUP =
  'app-no-drag inline-flex h-7.25 items-center gap-0.5 rounded-control border border-line-subtle bg-surface-raised p-0.5';

/**
 * The two controls that open a surface over the canvas, drawn as the one group the reference sets.
 *
 * @summary Reach for it at the trailing end of a gateway's toolbar. Both controls open something
 * over the canvas rather than acting on the gateway, which is what the shared border says.
 */
export function SurfaceControls() {
  const logsShown = useSyncExternalStore(subscribeToLogsDrawerVisibility, logsDrawerOpen);

  return (
    <span className={GROUP}>
      <ToolbarButton
        expanded={logsShown}
        glyph="panel-bottom"
        label="Request log"
        onPress={toggleLogsDrawer}
        where="grouped"
      />
      <InspectorToggle where="grouped" />
    </span>
  );
}
