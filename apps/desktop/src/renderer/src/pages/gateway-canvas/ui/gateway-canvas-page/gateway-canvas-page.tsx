import type { Account, GatewayConfig, LogRow } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';
import { useRef, useSyncExternalStore } from 'react';

import type { PickerOnCanvas } from './picker-on-canvas';
import type { RemovalAsked } from './removal-flow';
import type { ComposedCanvas } from './use-gateway-canvas';

import {
  accountsQueryOptions,
  engineLogsQueryOptions,
  engineStatesQueryOptions,
  gatewayStateIn,
  gatewaysQueryOptions,
} from '../../../../shared/api';
import {
  inspectorOpen,
  keepPanelWidth,
  logsDrawerOpen,
  panelBounds,
  setPanelWidth,
  shownAsAskModal,
  subscribeToInspectorVisibility,
  subscribeToLogsDrawerVisibility,
  subscribeToPanelWidths,
  toggleInspector,
} from '../../../../shared/lib';
import { Button, PanelSeparator } from '../../../../shared/ui';
import { inspectorWidth } from '../../lib/inspector-width';
import { usePanelReveal } from '../../lib/use-inspector-reveal';
import { AnchoredPicker } from '../anchored-picker/anchored-picker';
import { GatewayDrawer } from '../gateway-drawer/gateway-drawer';
import { GatewayStage } from '../gateway-stage/gateway-stage';
import { LogsDrawer } from '../logs-drawer/logs-drawer';
import { TrafficFooter } from '../traffic-footer/traffic-footer';
import {
  useInspectorPutAwayOnLeave,
  useLogsCommand,
  useMenuReadsTheDrawer,
  useSelectionPutAwayWithInspector,
} from './canvas-page-hooks';
import { useGatewayCanvas } from './use-gateway-canvas';

const REMOVAL_HEADING = 'removal-asked-heading';

function anchoredPicker(picker: PickerOnCanvas | undefined): ReactNode {
  if (picker === undefined) {
    return null;
  }

  const {
    groups,
    refusal,
    stage,
    anchorSeat,
    onDismiss,
    onPickAccount,
    onPickProviderModel,
    onSelectDifferentProvider,
  } = picker;

  return (
    <AnchoredPicker
      groups={groups}
      onDismiss={onDismiss}
      onPickAccount={onPickAccount}
      onPickProviderModel={onPickProviderModel}
      onSelectDifferentProvider={onSelectDifferentProvider}
      refusal={refusal}
      seat={anchorSeat}
      stage={stage}
    />
  );
}

const REMOVAL_WORDING = {
  'virtual-model': {
    subject: 'virtual model',
    consequence: 'The definition leaves the gateway, and clients stop being served under its id.',
  },
  gateway: {
    subject: 'gateway',
    consequence: 'The gateway stops serving, and its whole composition leaves this app.',
  },
  target: {
    subject: 'target',
    consequence: 'The binding releases, and the virtual model returns to the canvas as a draft.',
  },
} as const;

function removalDialog(removal: RemovalAsked | undefined): ReactNode {
  if (removal === undefined) {
    return null;
  }

  const { kind, name, onCancel, onConfirm } = removal;
  const wording = REMOVAL_WORDING[kind];

  return (
    <dialog
      aria-labelledby={REMOVAL_HEADING}
      className="m-auto w-80 menu-surface p-4"
      onCancel={onCancel}
      ref={shownAsAskModal}
    >
      <p className="text-control font-semibold text-ink" id={REMOVAL_HEADING}>
        Delete the {wording.subject} &quot;{name}&quot;?
      </p>
      <p className="mt-1 text-detail text-ink-secondary">{wording.consequence}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button onPress={onCancel}>Cancel</Button>
        <Button glyph="trash" onPress={onConfirm} variant="danger">
          Delete
        </Button>
      </div>
    </dialog>
  );
}

type InspectorBeside = {
  gateway: GatewayConfig;
  reveal: ReturnType<typeof usePanelReveal>;
  width: number;
  canvas: ComposedCanvas;
};

/**
 * The inspector and the border that sizes it, or nothing at all while it stands away.
 *
 * @summary The border only exists while the panel does, because a strip that sized nothing would
 * still take a tab stop and still answer a drag.
 */
function inspectorBeside({ gateway, reveal, width, canvas }: InspectorBeside): ReactNode {
  const { askRemoval, onDraftDefined, refusal, selectNode, subject } = canvas;

  if (!reveal.rendered) {
    return null;
  }

  return (
    <>
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
      <GatewayDrawer
        gateway={gateway}
        leaving={reveal.leaving}
        onAskRemoval={askRemoval}
        onDraftDefined={onDraftDefined}
        onModelRenamed={(modelId) => {
          selectNode(`model:${modelId}`);
        }}
        refusal={refusal}
        subject={subject}
      />
    </>
  );
}

type CanvasColumn = {
  slug: string;
  gateway: GatewayConfig;
  accounts: readonly Account[];
  rows: readonly LogRow[] | undefined;
  serving: 'running' | 'stopped';
  logs: ReturnType<typeof usePanelReveal>;
  canvas: ComposedCanvas;
};

/**
 * The canvas column: the stage a gateway is composed on, the logs under it, and the traffic strip.
 *
 * @summary The strip and logs belong to the left column rather than the window, so both stop where
 * the full-height inspector begins. Opening the logs shrinks only the stage: the inspector keeps
 * all of its height and the drawer keeps all of its width, with neither covering the other.
 */
function canvasColumn(standing: CanvasColumn): ReactNode {
  const { slug, gateway, accounts, rows, serving, logs, canvas } = standing;

  return (
    <div className="flex min-w-0 flex-1 flex-col" data-canvas-column="">
      <GatewayStage announced={canvas.announced} flow={canvas.flow} slug={slug}>
        {anchoredPicker(canvas.picker)}
      </GatewayStage>
      {logs.rendered ? (
        <LogsDrawer
          accounts={accounts}
          gateway={gateway}
          leaving={logs.leaving}
          rows={rows ?? []}
          serving={serving}
          subject={canvas.subject}
        />
      ) : null}
      <TrafficFooter
        nodes={canvas.flow.nodes.length}
        slug={slug}
        wires={canvas.flow.edges.length}
      />
    </div>
  );
}

/**
 * The selected gateway: the canvas, its logs and traffic strip, and the inspector beside them.
 *
 * @summary Reach for it from the gateway route. Selecting any card or cable opens the inspector
 * on that subject and a pane click puts both the selection and the inspector away, so the drawer
 * is a thing a person opens by pointing at what they mean. The logs and traffic strip stay in the
 * canvas column while the inspector keeps the full-height column beside them, so all of both panels
 * remain visible without overlap. A draft in flight outlives everything short of finishing or
 * deleting it. A slug no stored gateway holds lands on the same not-found state a mistyped address
 * does, because a gateway that was deleted and one that never existed are the same fact to the
 * person reading.
 */
type GatewayCanvasPageProps = {
  /** The gateway the route selected, which every surface on this page reads. */
  slug: string;
  /** Where the person lands once this gateway is deleted, since the page cannot stay. */
  onGatewayRemoved?: (() => void) | undefined;
};

const stayAfterRemoval = (): undefined => undefined;

export function GatewayCanvasPage({
  slug,
  onGatewayRemoved = stayAfterRemoval,
}: GatewayCanvasPageProps) {
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: registry } = useSuspenseQuery(accountsQueryOptions);
  const { data: engines } = useSuspenseQuery(engineStatesQueryOptions);
  const { data: served } = useQuery(engineLogsQueryOptions(slug));
  const shown = useSyncExternalStore(subscribeToInspectorVisibility, inspectorOpen);
  const logsShown = useSyncExternalStore(subscribeToLogsDrawerVisibility, logsDrawerOpen);
  const width = useSyncExternalStore(subscribeToPanelWidths, inspectorWidth);
  const inspector = usePanelReveal(shown);
  const logs = usePanelReveal(logsShown);
  const gateway = gateways.find((held) => held.slug === slug);
  const canvas = useGatewayCanvas(slug, gateway, registry.accounts, onGatewayRemoved);
  const gatewayOnceStood = useRef(false);

  useLogsCommand();
  useInspectorPutAwayOnLeave();
  useSelectionPutAwayWithInspector(shown, inspector.rendered, canvas);
  useMenuReadsTheDrawer(logsShown);

  if (gateway === undefined || canvas === undefined) {
    if (gatewayOnceStood.current) {
      return null;
    }

    throw notFound();
  }

  gatewayOnceStood.current = true;

  return (
    <div className="flex h-full min-h-0" data-canvas-workspace="">
      {canvasColumn({
        slug,
        gateway,
        accounts: registry.accounts,
        rows: served,
        serving: gatewayStateIn(engines, slug).status,
        logs,
        canvas,
      })}
      {inspectorBeside({ gateway, reveal: inspector, width, canvas })}
      {removalDialog(canvas.removal)}
    </div>
  );
}
