import type { Account, GatewayConfig, LogRow, Settings } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { DEFAULT_GATEWAY_BIND_ADDRESS } from '@recompose/contracts';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';
import { useRef } from 'react';

import type { SilenceOnTheCanvas } from './canvas-page-hooks';
import type { PickerOnCanvas } from './picker-on-canvas';
import type { ComposedCanvas } from './use-gateway-canvas';

import {
  accountsQueryOptions,
  engineLogsQueryOptions,
  engineStatesQueryOptions,
  gatewayStateIn,
  gatewaysQueryOptions,
  settingsQueryOptions,
} from '../../../../shared/api';
import {
  keepPanelWidth,
  panelBounds,
  setPanelWidth,
  toggleInspector,
} from '../../../../shared/lib';
import { PanelSeparator } from '../../../../shared/ui';
import { gatewayBaseUrl } from '../../lib/gateway-base-url';
import { usePanelReveal } from '../../lib/use-inspector-reveal';
import { AnchoredPicker } from '../anchored-picker/anchored-picker';
import { BranchWording } from '../branch-wording/branch-wording';
import { ConnectInView } from '../connect-in-view/connect-in-view';
import { GatewayDrawer } from '../gateway-drawer/gateway-drawer';
import { GatewayStage } from '../gateway-stage/gateway-stage';
import { LogsDrawer } from '../logs-drawer/logs-drawer';
import { RemovalDialog } from '../removal-dialog/removal-dialog';
import { StoppedAnsweringNote } from '../stopped-answering-note/stopped-answering-note';
import { TrafficFooter } from '../traffic-footer/traffic-footer';
import {
  useInspectorPutAwayOnLeave,
  useLogsCommand,
  useMenuAsksGatewayRemoval,
  useMenuCopiesBaseUrl,
  useMenuReadsTheDrawer,
  usePanelStandings,
  useSelectionPutAwayWithInspector,
  useStoppedAnswering,
} from './canvas-page-hooks';
import { useGatewayCanvas } from './use-gateway-canvas';

function anchoredPicker(picker: PickerOnCanvas | undefined): ReactNode {
  if (picker === undefined) {
    return null;
  }

  const {
    groups,
    refusal,
    pickedName,
    stage,
    anchorSeat,
    onDismiss,
    onPickAccount,
    onPickKind,
    onPickProviderModel,
    onPickRouterMode,
    onStepBack,
  } = picker;

  return (
    <AnchoredPicker
      groups={groups}
      onDismiss={onDismiss}
      onPickAccount={onPickAccount}
      onPickKind={onPickKind}
      onPickProviderModel={onPickProviderModel}
      onPickRouterMode={onPickRouterMode}
      onStepBack={onStepBack}
      pickedName={pickedName}
      refusal={refusal}
      seat={anchorSeat}
      stage={stage}
    />
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
        onSelectNode={selectNode}
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
  /** What the canvas knows about this gateway going quiet, and the acts it offers about it. */
  silence: SilenceOnTheCanvas;
};

/**
 * The canvas column: the stage a gateway is composed on, the logs under it, and the traffic strip.
 *
 * @summary The strip and logs belong to the left column rather than the window, so both stop where
 * the full-height inspector begins. Opening the logs shrinks only the stage: the inspector keeps
 * all of its height and the drawer keeps all of its width, with neither covering the other. A
 * gateway that went quiet says so in the same column and in the same way, taking a band of its own
 * rather than a layer over the composition it is about.
 */
function canvasColumn(standing: CanvasColumn): ReactNode {
  const { slug, gateway, accounts, rows, serving, logs, canvas } = standing;
  const { putAway, startAgain, stoppedAnswering } = standing.silence;

  return (
    <div className="flex min-w-0 flex-1 flex-col" data-canvas-column="">
      <GatewayStage announced={canvas.announced} flow={canvas.flow}>
        {anchoredPicker(canvas.picker)}
      </GatewayStage>
      <BranchWording gateway={gateway} />
      {stoppedAnswering ? (
        <StoppedAnsweringNote
          gateway={gateway.displayName}
          onPutAway={putAway}
          onStartAgain={startAgain}
        />
      ) : null}
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

function printedBaseUrl(
  gateway: GatewayConfig | undefined,
  settings: Settings,
): string | undefined {
  return gateway === undefined
    ? undefined
    : gatewayBaseUrl(gateway, settings.bindAddress ?? DEFAULT_GATEWAY_BIND_ADDRESS);
}

function askRemovalOf(canvas: ComposedCanvas | undefined): ((nodeId: string) => void) | undefined {
  return canvas?.askRemoval;
}

export function GatewayCanvasPage({
  slug,
  onGatewayRemoved = stayAfterRemoval,
}: GatewayCanvasPageProps) {
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: registry } = useSuspenseQuery(accountsQueryOptions);
  const { data: engines } = useSuspenseQuery(engineStatesQueryOptions);
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { data: served } = useQuery(engineLogsQueryOptions(slug));
  const { shown, logsShown, width, inspector, logs } = usePanelStandings();
  const gateway = gateways.find((held) => held.slug === slug);
  const canvas = useGatewayCanvas(slug, gateway, registry.accounts, onGatewayRemoved);
  const gatewayOnceStood = useRef(false);

  useLogsCommand();
  useInspectorPutAwayOnLeave();
  useSelectionPutAwayWithInspector(shown, inspector.rendered, canvas);
  useMenuReadsTheDrawer(logsShown);
  useMenuAsksGatewayRemoval(askRemovalOf(canvas));

  const copySpoken = useMenuCopiesBaseUrl(printedBaseUrl(gateway, settings));
  const serving = gatewayStateIn(engines, slug).status;
  const silence = useStoppedAnswering(slug, serving === 'running');

  if (gateway === undefined || canvas === undefined) {
    if (gatewayOnceStood.current) {
      return null;
    }

    throw notFound();
  }

  gatewayOnceStood.current = true;

  return (
    <div className="@container flex h-full min-h-0" data-canvas-workspace="">
      {canvasColumn({
        slug,
        gateway,
        accounts: registry.accounts,
        rows: served,
        serving,
        logs,
        canvas,
        silence,
      })}
      {inspectorBeside({ gateway, reveal: inspector, width, canvas })}
      <ConnectInView slug={slug} />
      <RemovalDialog removal={canvas.removal} />
      <p aria-live="polite" className="sr-only">
        {copySpoken}
      </p>
    </div>
  );
}
