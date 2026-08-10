import type { Account, GatewayConfig, LogRow } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';
import { useEffect, useSyncExternalStore } from 'react';

import type { ComposedCanvas, PickerOnCanvas, RemovalAsked } from './use-gateway-canvas';

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
  subscribeToInspectorVisibility,
  subscribeToLogsDrawerVisibility,
  subscribeToPanelWidths,
  toggleInspector,
  toggleLogsDrawer,
} from '../../../../shared/lib';
import { PanelSeparator } from '../../../../shared/ui';
import { inspectorWidth } from '../../lib/inspector-width';
import { useInspectorReveal } from '../../lib/use-inspector-reveal';
import { AnchoredPicker } from '../anchored-picker/anchored-picker';
import { GatewayDrawer } from '../gateway-drawer/gateway-drawer';
import { GatewayStage } from '../gateway-stage/gateway-stage';
import { LogsDrawer } from '../logs-drawer/logs-drawer';
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

type InspectorBeside = {
  gateway: GatewayConfig;
  reveal: ReturnType<typeof useInspectorReveal>;
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
  const { onDraftDefined, refusal, subject } = canvas;

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
        onDraftDefined={onDraftDefined}
        refusal={refusal}
        subject={subject}
      />
    </>
  );
}

type LogsUnderTheStage = {
  gateway: GatewayConfig;
  accounts: readonly Account[];
  rows: readonly LogRow[] | undefined;
  serving: 'running' | 'stopped';
  canvas: ComposedCanvas;
};

function logsUnderTheStage(standing: LogsUnderTheStage): ReactNode {
  const { gateway, accounts, rows, serving, canvas } = standing;
  const { onSelectSubject, subject } = canvas;

  return (
    <LogsDrawer
      accounts={accounts}
      gateway={gateway}
      onSelectSubject={onSelectSubject}
      rows={rows ?? []}
      serving={serving}
      subject={subject}
    />
  );
}

/**
 * Turns the Gateway menu's drawer command into the one open state the drawer reads.
 *
 * @summary The command arrives on the channel every Gateway act rides, and the canvas passes this
 * one through untouched, because the drawer stands beside the flow rather than inside it.
 */
function useLogsCommand(): void {
  useEffect(
    () =>
      window.recomposeEvents['canvas:command']((command) => {
        if (command === 'toggle-logs') {
          toggleLogsDrawer();
        }
      }),
    [],
  );
}

/**
 * Tells main whether the drawer stands, so the menu item's check mark reads the truth.
 *
 * @summary The drawer opens from the footer, from the menu, and from a drag that collapsed it, so
 * the menu cannot know where it ended up by remembering what it asked for. It hears the answer
 * instead, which is what stops the check mark from disagreeing with the screen.
 */
function useMenuReadsTheDrawer(open: boolean): void {
  useEffect(() => {
    void window.recompose['system:logs-drawer']({ open });
  }, [open]);
}

/**
 * The selected gateway: the canvas it is composed on, the logs under it, and the inspector beside it.
 *
 * @summary Reach for it from the gateway route. Selecting any card or cable opens the inspector
 * on that subject and a pane click puts both the selection and the inspector away, so the drawer
 * is a thing a person opens by pointing at what they mean. The logs drawer shares the canvas
 * column, standing under the stage rather than over it, so opening it shrinks the canvas instead of
 * covering anything a person could press. A draft in flight outlives everything short of finishing
 * or deleting it. A slug no stored gateway holds lands on the same not-found state a mistyped
 * address does, because a gateway that was deleted and one that never existed are the same fact to
 * the person reading.
 */
export function GatewayCanvasPage({ slug }: { slug: string }) {
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: registry } = useSuspenseQuery(accountsQueryOptions);
  const { data: engines } = useSuspenseQuery(engineStatesQueryOptions);
  const { data: served } = useQuery(engineLogsQueryOptions(slug));
  const shown = useSyncExternalStore(subscribeToInspectorVisibility, inspectorOpen);
  const logsShown = useSyncExternalStore(subscribeToLogsDrawerVisibility, logsDrawerOpen);
  const width = useSyncExternalStore(subscribeToPanelWidths, inspectorWidth);
  const inspector = useInspectorReveal(shown);
  const gateway = gateways.find((held) => held.slug === slug);
  const canvas = useGatewayCanvas(slug, gateway, registry.accounts);

  useLogsCommand();
  useMenuReadsTheDrawer(logsShown);

  if (gateway === undefined || canvas === undefined) {
    throw notFound();
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <GatewayStage announced={canvas.announced} flow={canvas.flow}>
          {anchoredPicker(canvas.picker)}
        </GatewayStage>
        {logsShown
          ? logsUnderTheStage({
              gateway,
              accounts: registry.accounts,
              rows: served,
              serving: gatewayStateIn(engines, slug).status,
              canvas,
            })
          : null}
      </div>
      {inspectorBeside({ gateway, reveal: inspector, width, canvas })}
      {removalDialog(canvas.removal)}
    </div>
  );
}
