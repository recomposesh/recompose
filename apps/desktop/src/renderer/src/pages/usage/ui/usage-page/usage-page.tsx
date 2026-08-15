import type { QueryClient } from '@tanstack/react-query';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { UsageSearch } from '../../lib/usage-search';
import type { PanelUnit } from '../breakdown-panel/breakdown-panel';
import type { UsagePanels, UsageQuiet, UsageView } from './use-usage-view';

import { Button } from '../../../../shared/ui';
import { quietRecovery, quietSentence } from '../../lib/quiet-recovery';
import { chartSubCaption, panelsCaption, scopeSentence } from '../../lib/usage-caption';
import { filteredMembers, spendSnappedRange } from '../../lib/usage-search';
import { windowWording } from '../../lib/usage-window';
import { BreakdownPanel } from '../breakdown-panel/breakdown-panel';
import { ChartPanel } from '../chart-panel/chart-panel';
import { MetricTiles } from '../metric-tiles/metric-tiles';
import { QuietReading } from '../quiet-reading/quiet-reading';
import { UsageHeader } from '../usage-header/usage-header';
import { movedSearch } from './usage-page-moves';
import { useUsageView } from './use-usage-view';

type UsagePageProps = {
  /** The typed view the address carries. */
  search: UsageSearch;
  /** Receives the whole next view whenever a control moves it. */
  onSearchChange: (next: UsageSearch) => void;
};

function quietReading(
  quiet: UsageQuiet,
  search: UsageSearch,
  onSearchChange: (next: UsageSearch) => void,
) {
  if (quiet === 'never-served') {
    return (
      <QuietReading
        sentence="Send a request through a gateway and it collects here."
        title="No requests yet"
      />
    );
  }

  const recovery = quietRecovery(search);

  return (
    <QuietReading
      act={
        recovery === undefined
          ? undefined
          : {
              label: recovery.label,
              onPress: () => {
                onSearchChange(recovery.next);
              },
            }
      }
      sentence={quietSentence(search)}
      title="No requests"
    />
  );
}

function refusalCard(failure: string, retry: () => void) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line-subtle bg-surface-card px-4 py-3">
      <p className="text-body text-danger-ink">{failure}</p>
      <Button onPress={retry} variant="secondary">
        Try again
      </Button>
    </div>
  );
}

function refreshedUsageReadings(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['usage-report'] });
}

type PanelUnits = Record<keyof UsagePanels, PanelUnit>;

function panelRow(
  panels: UsagePanels,
  units: PanelUnits,
  onUnitChange: (panel: keyof UsagePanels, unit: PanelUnit) => void,
) {
  const named = [
    { key: 'gateway', title: 'By gateway' },
    { key: 'virtualModel', title: 'By virtual model' },
    { key: 'target', title: 'By target' },
  ] as const;

  return (
    <div className="flex flex-wrap gap-4">
      {named.map((panel) => (
        <BreakdownPanel
          key={panel.key}
          onUnitChange={(unit) => {
            onUnitChange(panel.key, unit);
          }}
          rows={panels[panel.key]}
          title={panel.title}
          unit={units[panel.key]}
        />
      ))}
    </div>
  );
}

type BodyMoves = {
  search: UsageSearch;
  onSearchChange: (next: UsageSearch) => void;
  tableOpen: boolean;
  units: PanelUnits;
  onUnitChange: (panel: keyof UsagePanels, unit: PanelUnit) => void;
  onRetry: () => void;
};

type ReadingsProps = Omit<BodyMoves, 'onRetry'> & {
  view: Extract<UsageView, { state: 'readings' }>;
};

function readingsBody(props: ReadingsProps) {
  const { view, search, onSearchChange } = props;

  return (
    <>
      <ChartPanel
        drawn={view.chart}
        edgeAt={view.edgeAt}
        measure={search.metric}
        onMeasureChange={(metric) => {
          onSearchChange({
            ...search,
            metric,
            range: metric === 'spend' ? spendSnappedRange(search.range) : search.range,
          });
        }}
        onStackedByChange={(stackedBy) => {
          onSearchChange({ ...search, stackedBy });
        }}
        quiet={
          view.quiet === undefined ? undefined : quietReading(view.quiet, search, onSearchChange)
        }
        stackedBy={search.stackedBy}
        subCaption={chartSubCaption(view.widthWord)}
        tableOpen={props.tableOpen}
      />
      {panelRow(view.panels, props.units, props.onUnitChange)}
      <p className="text-caption text-ink-secondary">{panelsCaption(view.widthWord)}</p>
    </>
  );
}

function viewBody(view: UsageView, moves: BodyMoves) {
  if (view.state === 'refused') {
    return refusalCard(view.failure, moves.onRetry);
  }

  if (view.state === 'loading') {
    return <MetricTiles faces={view.faces} />;
  }

  return (
    <>
      <MetricTiles faces={view.faces} />
      {readingsBody({ ...moves, view })}
    </>
  );
}

function useMenuCommands(
  search: UsageSearch,
  onSearchChange: (next: UsageSearch) => void,
  queryClient: QueryClient,
  setTableOpen: (moved: (open: boolean) => boolean) => void,
): void {
  useEffect(
    () =>
      window.recomposeEvents['usage:command']((command) => {
        if (command === 'toggle-table-twin') {
          setTableOpen((open) => !open);

          return;
        }

        if (command === 'refresh') {
          refreshedUsageReadings(queryClient);

          return;
        }

        const moved = movedSearch(command, search);

        if (moved !== undefined) {
          onSearchChange(moved);
        }
      }),
    [search, onSearchChange, queryClient, setTableOpen],
  );
}

/**
 * The usage explorer: what the window served, drawn over time, and folded three ways.
 *
 * @summary Every reading also exists as printed text, missing data reads as missing rather than
 * as zero, and the whole view lives in the address so a reload lands on the same screen.
 */
export function UsagePage({ search, onSearchChange }: UsagePageProps) {
  const queryClient = useQueryClient();
  const { view, now, updatedAt } = useUsageView(search);
  const [tableOpen, setTableOpen] = useState(false);
  const [units, setUnits] = useState<PanelUnits>({
    gateway: 'requests',
    virtualModel: 'requests',
    target: 'requests',
  });

  useMenuCommands(search, onSearchChange, queryClient, setTableOpen);

  useEffect(() => {
    void window.recompose['system:usage-table']({ open: tableOpen });
  }, [tableOpen]);

  return (
    <section className="flex w-full flex-col gap-4 px-6 pt-explorer-top pb-6" data-focus-group="">
      <UsageHeader
        now={now}
        onRefresh={() => {
          refreshedUsageReadings(queryClient);
        }}
        scope={scopeSentence({
          gateways: filteredMembers(search, 'gateways'),
          providers: filteredMembers(search, 'providers'),
          window: windowWording(search, now),
        })}
        updatedAt={updatedAt}
      />
      {viewBody(view, {
        search,
        onSearchChange,
        tableOpen,
        units,
        onUnitChange: (panel, unit) => {
          setUnits((held) => ({ ...held, [panel]: unit }));
        },
        onRetry: () => {
          refreshedUsageReadings(queryClient);
        },
      })}
    </section>
  );
}
