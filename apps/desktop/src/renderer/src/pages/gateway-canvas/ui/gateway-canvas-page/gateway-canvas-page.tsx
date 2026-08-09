import type { ReactNode } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';
import { ViewportPortal } from '@xyflow/react';
import { useSyncExternalStore } from 'react';

import type { PickerOnCanvas, RemovalAsked } from './use-gateway-canvas';

import { accountsQueryOptions, gatewaysQueryOptions } from '../../../../shared/api';
import {
  inspectorOpen,
  keepPanelWidth,
  panelBounds,
  setPanelWidth,
  subscribeToInspectorVisibility,
  subscribeToPanelWidths,
  toggleInspector,
} from '../../../../shared/lib';
import { PanelSeparator } from '../../../../shared/ui';
import { inspectorWidth } from '../../lib/inspector-width';
import { useInspectorReveal } from '../../lib/use-inspector-reveal';
import { DropPicker } from '../drop-picker/drop-picker';
import { GatewayDrawer } from '../gateway-drawer/gateway-drawer';
import { GatewayStage } from '../gateway-stage/gateway-stage';
import { useGatewayCanvas } from './use-gateway-canvas';

const REMOVAL_HEADING = 'removal-asked-heading';

function anchoredPicker(picker: PickerOnCanvas | undefined): ReactNode {
  if (picker === undefined) {
    return null;
  }

  const { groups, stage, anchorSeat, onDismiss, onPickAccount, onPickProviderModel } = picker;

  return (
    <ViewportPortal>
      <div
        className="pointer-events-auto absolute h-19.5 w-39.5"
        style={{
          transform: `translate(${String(anchorSeat.x)}px, ${String(anchorSeat.y)}px)`,
        }}
      >
        <DropPicker
          groups={groups}
          onDismiss={onDismiss}
          onPickAccount={onPickAccount}
          onPickProviderModel={onPickProviderModel}
          stage={stage}
        />
      </div>
    </ViewportPortal>
  );
}

function removalDialog(removal: RemovalAsked | undefined): ReactNode {
  if (removal === undefined) {
    return null;
  }

  const { name, onCancel, onConfirm } = removal;

  return (
    <dialog
      aria-labelledby={REMOVAL_HEADING}
      className="m-auto w-80 menu-surface p-4"
      onCancel={onCancel}
      ref={(asking) => {
        if (asking !== null && !asking.open) {
          asking.showModal();
        }
      }}
    >
      <p className="text-control font-semibold text-ink" id={REMOVAL_HEADING}>
        Delete the virtual model &quot;{name}&quot;?
      </p>
      <p className="mt-1 text-detail text-ink-secondary">
        The definition leaves the gateway, and clients stop being served under its id.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button className="push-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="push-button-primary" onClick={onConfirm} type="button">
          Delete
        </button>
      </div>
    </dialog>
  );
}

/**
 * The selected gateway: the canvas it is composed on, and the inspector beside it.
 *
 * @summary Reach for it from the gateway route. Selecting any card or cable opens the inspector
 * on that subject and a pane click puts both the selection and the inspector away, so the drawer
 * is a thing a person opens by pointing at what they mean. A draft in flight outlives everything
 * short of finishing or deleting it. A slug no stored gateway holds lands on the same not-found
 * state a mistyped address does, because a gateway that was deleted and one that never existed
 * are the same fact to the person reading.
 */
export function GatewayCanvasPage({ slug }: { slug: string }) {
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: registry } = useSuspenseQuery(accountsQueryOptions);
  const shown = useSyncExternalStore(subscribeToInspectorVisibility, inspectorOpen);
  const width = useSyncExternalStore(subscribeToPanelWidths, inspectorWidth);
  const inspector = useInspectorReveal(shown);
  const gateway = gateways.find((held) => held.slug === slug);
  const canvas = useGatewayCanvas(slug, gateway, registry.accounts);

  if (gateway === undefined || canvas === undefined) {
    throw notFound();
  }

  const { onDraftDefined } = canvas;

  return (
    <div className="flex h-full min-h-0">
      <GatewayStage announced={canvas.announced} flow={canvas.flow}>
        {anchoredPicker(canvas.picker)}
      </GatewayStage>
      {inspector.rendered ? (
        <PanelSeparator
          bounds={panelBounds.inspector}
          label="Inspector width"
          onCollapse={toggleInspector}
          onResize={(asked) => {
            setPanelWidth('inspector', asked);
          }}
          onRestore={toggleInspector}
          onSettled={() => {
            keepPanelWidth('inspector');
          }}
          panelEdge="leading"
          width={width}
        />
      ) : null}
      {inspector.rendered ? (
        <GatewayDrawer
          gateway={gateway}
          leaving={inspector.leaving}
          onDraftDefined={onDraftDefined}
          refusal={canvas.refusal}
          subject={canvas.subject}
        />
      ) : null}
      {removalDialog(canvas.removal)}
    </div>
  );
}
