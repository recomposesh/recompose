import type { ReactNode } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';
import { useSyncExternalStore } from 'react';

import type { ComposedCanvas, PickerOnCanvas, RemovalAsked } from './use-gateway-canvas';

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
import { AnchoredPicker } from '../anchored-picker/anchored-picker';
import { GatewayDrawer } from '../gateway-drawer/gateway-drawer';
import { GatewayStage } from '../gateway-stage/gateway-stage';
import { TrafficFooter } from '../traffic-footer/traffic-footer';
import { useGatewayCanvas } from './use-gateway-canvas';

const REMOVAL_HEADING = 'removal-asked-heading';

function anchoredPicker(picker: PickerOnCanvas | undefined): ReactNode {
  if (picker === undefined) {
    return null;
  }

  const { groups, refusal, stage, anchorSeat, onDismiss, onPickAccount, onPickProviderModel } =
    picker;

  return (
    <AnchoredPicker
      groups={groups}
      onDismiss={onDismiss}
      onPickAccount={onPickAccount}
      onPickProviderModel={onPickProviderModel}
      refusal={refusal}
      seat={anchorSeat}
      stage={stage}
    />
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
 * The canvas column: the stage a gateway is composed on, and the traffic strip under it.
 *
 * @summary The strip belongs to this column rather than to the window, so it spans the canvas and
 * stops where the inspector begins, and the tally beside its readings counts the very cards and
 * cables standing above it.
 */
function canvasColumn(slug: string, canvas: ComposedCanvas): ReactNode {
  return (
    <div className="flex min-w-0 flex-1 flex-col" data-canvas-column="">
      <GatewayStage announced={canvas.announced} flow={canvas.flow}>
        {anchoredPicker(canvas.picker)}
      </GatewayStage>
      <TrafficFooter
        nodes={canvas.flow.nodes.length}
        slug={slug}
        wires={canvas.flow.edges.length}
      />
    </div>
  );
}

/**
 * The selected gateway: the canvas it is composed on, the strip under it, and the inspector beside.
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
      {canvasColumn(slug, canvas)}
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
