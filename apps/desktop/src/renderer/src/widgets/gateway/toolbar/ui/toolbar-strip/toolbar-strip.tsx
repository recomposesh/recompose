import type { GatewayEngineState } from '@recompose/contracts';

import { useSyncExternalStore } from 'react';

import {
  askTheCanvas,
  connectSheetOpen,
  logsDrawerOpen,
  openConnectSheet,
  sidebarHidden,
  subscribeToConnectSheetVisibility,
  subscribeToLogsDrawerVisibility,
  subscribeToSidebarVisibility,
  toggleLogsDrawer,
} from '../../../../../shared/lib';
import { InspectorToggle, SidebarToggle, ToolbarButton } from '../../../../../shared/ui';
import { AddressPill } from '../address-pill/address-pill';

const GROUP =
  'app-no-drag inline-flex h-7.25 items-center gap-0.5 rounded-control border border-line-subtle bg-surface-raised p-0.5';

type ToolbarStripProps = {
  address: string;
  /** The gateway the strip acts on, spoken as the toolbar's own name. */
  name: string;
  onRun: () => void;
  port: number;
  running: boolean;
  status: GatewayEngineState['status'];
};

/**
 * The strip itself, holding the run control, the address, and the four controls the reference draws.
 *
 * @summary The window hides its own title bar, so the bare surface between these controls is the
 * only title bar the strip has left to offer. It stands as the drag region and every control on
 * it takes itself back out, which is what leaves the gaps to move the window by and the controls
 * to press.
 */
export function ToolbarStrip({ address, name, onRun, port, running, status }: ToolbarStripProps) {
  const away = useSyncExternalStore(subscribeToSidebarVisibility, sidebarHidden);
  const logsShown = useSyncExternalStore(subscribeToLogsDrawerVisibility, logsDrawerOpen);
  const connectShown = useSyncExternalStore(subscribeToConnectSheetVisibility, connectSheetOpen);

  return (
    <div
      aria-label={name}
      className={`app-drag flex h-toolbar items-center gap-2.5 pe-3.5 ${away ? 'ps-window-controls-width' : 'ps-3.5'}`}
      role="toolbar"
    >
      <SidebarToggle where="standing" />
      <ToolbarButton
        glyph={running ? 'stop' : 'play'}
        label={running ? 'Stop' : 'Start'}
        onPress={onRun}
        tone={running ? 'text-stopped' : 'text-running'}
        where="standing"
      />
      <ToolbarButton
        expanded={connectShown}
        glyph="book"
        label="Connect a client"
        onPress={openConnectSheet}
        where="standing"
      />
      <AddressPill address={address} port={port} status={status} />
      <ToolbarButton
        glyph="tidy"
        label="Tidy the canvas"
        onPress={() => {
          askTheCanvas('tidy');
        }}
        where="standing"
      />
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
    </div>
  );
}
