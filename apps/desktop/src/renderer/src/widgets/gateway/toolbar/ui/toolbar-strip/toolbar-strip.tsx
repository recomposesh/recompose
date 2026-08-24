import type { GatewayEngineState, WindowControls } from '@recompose/contracts';

import { useSyncExternalStore } from 'react';

import {
  askTheCanvas,
  barLeadInsetFor,
  barTailInsetFor,
  connectSheetOpen,
  openConnectSheet,
  sidebarHidden,
  subscribeToConnectSheetVisibility,
  subscribeToSidebarVisibility,
} from '../../../../../shared/lib';
import { SidebarToggle, ToolbarButton } from '../../../../../shared/ui';
import { AddressPill } from '../address-pill/address-pill';
import { SurfaceControls } from '../surface-controls/surface-controls';

type ToolbarStripProps = {
  address: string;
  /** The gateway the strip acts on, spoken as the toolbar's own name. */
  name: string;
  onRun: () => void;
  port: number;
  running: boolean;
  status: GatewayEngineState['status'];
  /** Which edge of the strip the window controls float over, which its acts stand clear of. */
  windowControls: WindowControls;
};

/**
 * The strip itself, holding the run control, the address, and the four controls the reference draws.
 *
 * @summary The window hides its own title bar, so the bare surface between these controls is the
 * only title bar the strip has left to offer. It stands as the drag region and every control on
 * it takes itself back out, which is what leaves the gaps to move the window by and the controls
 * to press.
 */
export function ToolbarStrip({
  address,
  name,
  onRun,
  port,
  running,
  status,
  windowControls,
}: ToolbarStripProps) {
  const away = useSyncExternalStore(subscribeToSidebarVisibility, sidebarHidden);
  const connectShown = useSyncExternalStore(subscribeToConnectSheetVisibility, connectSheetOpen);

  return (
    <div
      aria-label={name}
      className={`app-drag flex h-toolbar items-center gap-2.5 ${barLeadInsetFor(windowControls, away)} ${barTailInsetFor(windowControls)}`}
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
      <SurfaceControls />
    </div>
  );
}
