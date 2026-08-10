import type { Account, GatewayConfig, LogRow as LoggedRequest } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useState, useSyncExternalStore } from 'react';

import type { InspectorSubject } from '../gateway-drawer/gateway-drawer';

import {
  closeLogsDrawer,
  keepPanelWidth,
  panelBounds,
  panelWidth,
  setPanelWidth,
  subscribeToPanelWidths,
  toggleLogsDrawer,
} from '../../../../shared/lib';
import {
  Chip,
  Icon,
  OverflowMenu,
  PanelSeparator,
  SegmentedControl,
  StatusChip,
} from '../../../../shared/ui';
import { logScope } from '../../lib/log-scope';
import { LogList } from '../log-list/log-list';
import {
  EVERY_REQUEST,
  type Scope,
  modelScopes,
  scopeOf,
  scopeStrip,
  targetScope,
} from './log-scopes';

const NOTHING_YET: Record<InspectorSubject['kind'], string> = {
  gateway: 'No requests from any client app yet.',
  draft: 'No requests from any client app yet.',
  'virtual-model': 'No requests through this virtual model yet.',
  cable: 'No requests through this virtual model yet.',
  target: 'No requests reached this target yet.',
  'ghost-target': 'No requests reached the removed target yet.',
};

const streamStanding = {
  running: { word: 'Live', tone: 'positive' },
  stopped: { word: 'Stopped', tone: 'inert' },
} as const;

type ScopeControls = {
  options: readonly Scope[];
  hidden: readonly Scope[];
  lit: string;
  errorsOnly: boolean;
  onSelectSubject: (nodeId: string | undefined) => void;
  onSelectedChange: (only: boolean) => void;
};

function scopeControls(controls: ScopeControls): ReactNode {
  const { options, hidden, lit, errorsOnly, onSelectedChange } = controls;
  const onChangeValue = (value: string): void => {
    controls.onSelectSubject(value === EVERY_REQUEST ? undefined : value);
  };

  return (
    <>
      <SegmentedControl
        label="Log scope"
        onChangeValue={onChangeValue}
        options={options}
        value={lit}
      />
      <Chip onSelectedChange={onSelectedChange} selected={errorsOnly}>
        Errors
      </Chip>
      {hidden.length === 0 ? null : (
        <OverflowMenu
          items={hidden.map((scope) => ({
            label: scope.label,
            onSelect: () => {
              onChangeValue(scope.value);
            },
          }))}
          label="More log scopes"
        />
      )}
    </>
  );
}

type DrawerHead = {
  gateway: GatewayConfig;
  serving: 'running' | 'stopped';
  controls: ScopeControls;
};

function drawerHeader({ gateway, serving, controls }: DrawerHead): ReactNode {
  const stream = streamStanding[serving];

  return (
    <header className="flex h-status-bar shrink-0 items-center gap-2.5 border-b border-line-faint px-3">
      <h2 className="shrink-0 text-detail font-semibold text-ink">Logs · {gateway.displayName}</h2>
      <StatusChip tone={stream.tone} word={stream.word} />
      <div className="ms-auto flex min-w-0 items-center gap-2">
        {scopeControls(controls)}
        <button
          aria-label="Close logs"
          className="flex size-6 shrink-0 items-center justify-center rounded-control text-ink-secondary focus-ring hover:bg-surface-hover active:bg-surface-pressed"
          onClick={closeLogsDrawer}
          type="button"
        >
          <Icon className="size-4" name="close" />
        </button>
      </div>
    </header>
  );
}

function resizeEdge(height: number): ReactNode {
  return (
    <PanelSeparator
      axis="block"
      bounds={panelBounds.logs}
      label="Logs height"
      onCollapse={closeLogsDrawer}
      onResize={(asked) => {
        setPanelWidth('logs', asked);
      }}
      onRestore={toggleLogsDrawer}
      onSettled={() => {
        keepPanelWidth('logs');
      }}
      panelEdge="leading"
      width={height}
    />
  );
}

type LogsDrawerProps = {
  /** The gateway whose requests the drawer streams, which titles it. */
  gateway: GatewayConfig;
  /** The registry the rows read their accounts against, naming what served each request. */
  accounts: readonly Account[];
  /** Every request the gateway has served, newest first, before any scope narrows it. */
  rows: readonly LoggedRequest[];
  /** Whether the gateway is still answering, which is what the stream state reads. */
  serving: 'running' | 'stopped';
  /** What stands selected on the canvas, which is the scope the rows narrow to. */
  subject: InspectorSubject;
  /** Receives the canvas node a scope stands for, or nothing where the scope is the gateway. */
  onSelectSubject: (nodeId: string | undefined) => void;
};

/**
 * The gateway's request log, standing under the canvas while a person reads it.
 *
 * @summary Reach for it from the gateway page and nowhere else. It sits under the stage rather than
 * over it, so the composition stays visible and every card stays reachable while the rows stream:
 * nothing the drawer opens ever covers something a person was about to press. The scope strip and
 * the canvas selection are one mechanism read from two places, so pressing a segment selects that
 * card and selecting that card lights the segment, and a selected target brings a scope of its own
 * along for as long as the selection holds. The errors narrowing stands apart from all of it and
 * only ever takes requests away. The stream state holds its place in the header instead of
 * vanishing, because a gateway that stopped is a thing a person needs to read rather than to guess
 * from an absence. Dragging the top edge sizes the drawer and dragging it well down puts it away,
 * which is the same gesture every other panel in the app answers.
 */
export function LogsDrawer({
  gateway,
  accounts,
  rows,
  serving,
  subject,
  onSelectSubject,
}: LogsDrawerProps) {
  const [errorsOnly, setErrorsOnly] = useState(false);
  const height = useSyncExternalStore(subscribeToPanelWidths, logsHeight);
  const lit = scopeOf(subject);
  const transient = targetScope(subject, accounts);
  const strip = scopeStrip([{ value: EVERY_REQUEST, label: 'All' }, ...modelScopes(gateway)], lit);

  return (
    <>
      {resizeEdge(height)}
      <section
        className="flex shrink-0 flex-col overflow-hidden border-t border-line-subtle bg-surface-card"
        style={{ height: `${String(height)}px` }}
      >
        {drawerHeader({
          gateway,
          serving,
          controls: {
            options: transient === undefined ? strip.shown : [...strip.shown, transient],
            hidden: strip.hidden,
            lit,
            errorsOnly,
            onSelectSubject,
            onSelectedChange: setErrorsOnly,
          },
        })}
        <LogList
          accounts={accounts}
          nothingYet={NOTHING_YET[subject.kind]}
          rows={rows.filter(logScope(subject, errorsOnly))}
          scope={`${lit} ${String(errorsOnly)}`}
        />
      </section>
    </>
  );
}

function logsHeight(): number {
  return panelWidth('logs');
}
