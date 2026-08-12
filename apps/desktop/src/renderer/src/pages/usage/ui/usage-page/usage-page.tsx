import type { QueryClient } from '@tanstack/react-query';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { UsageSearch } from '../../lib/usage-search';
import type { PanelUnit } from '../breakdown-panel/breakdown-panel';
import type { UsagePanels, UsageStrips, UsageView } from './use-usage-view';

import { quotaWindowsQueryOptions, refreshedBalances } from '../../../../shared/api';
import { Button } from '../../../../shared/ui';
import { chartSubCaption, panelsCaption, scopeSentence } from '../../lib/usage-caption';
import { filteredMembers, spendSnappedRange } from '../../lib/usage-search';
import { windowWording } from '../../lib/usage-window';
import { BalanceCard } from '../balance-card/balance-card';
import { BreakdownPanel } from '../breakdown-panel/breakdown-panel';
import { ChartPanel } from '../chart-panel/chart-panel';
import { MetricTiles } from '../metric-tiles/metric-tiles';
import { QuotaStrip } from '../quota-strip/quota-strip';
import { UsageHeader } from '../usage-header/usage-header';
import { movedSearch } from './usage-page-moves';
import { useUsageView } from './use-usage-view';

type UsagePageProps = {
  /** The typed view the address carries. */
  search: UsageSearch;
  /** Receives the whole next view whenever a control moves it. */
  onSearchChange: (next: UsageSearch) => void;
};

function promiseCard() {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-card border border-line-subtle bg-surface-card px-6 py-12 text-center">
      <h2 className="text-heading text-ink">No requests yet</h2>
      <p className="max-w-102.5 text-body leading-normal text-ink-secondary">
        Once a gateway serves its first request, its rate, latency, tokens, and spend collect here.
      </p>
    </div>
  );
}

function refusalCard(failure: string, retry: () => void) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line-subtle bg-surface-card px-4 py-3">
      <p className="text-body text-danger-ink">{failure}</p>
      <Button onPress={retry} variant="secondary">
        Retry
      </Button>
    </div>
  );
}

function refreshedUsageReadings(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['usage-report'] });
  void queryClient.invalidateQueries({ queryKey: quotaWindowsQueryOptions.queryKey });
  void refreshedBalances(queryClient);
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
        stackedBy={search.stackedBy}
        subCaption={chartSubCaption(view.widthWord)}
        tableOpen={props.tableOpen}
      />
      {panelRow(view.panels, props.units, props.onUnitChange)}
      <p className="text-caption text-ink-secondary">{panelsCaption(view.widthWord)}</p>
    </>
  );
}

function accountStrips(strips: UsageStrips, onRefreshCredits: () => void) {
  return (
    <>
      <QuotaStrip accountNameOf={strips.accountNameOf} now={strips.now} windows={strips.windows} />
      <BalanceCard
        accountNameOf={strips.accountNameOf}
        balances={strips.balances}
        now={strips.now}
        onRefresh={onRefreshCredits}
      />
    </>
  );
}

function viewBody(view: UsageView, moves: BodyMoves) {
  if (view.state === 'refused') {
    return refusalCard(view.failure, moves.onRetry);
  }

  if (view.state === 'promise') {
    return promiseCard();
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
  const { view, strips, updatedAt } = useUsageView(search);
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
        now={strips.now}
        onRefresh={() => {
          refreshedUsageReadings(queryClient);
        }}
        scope={scopeSentence({
          gateways: filteredMembers(search, 'gateways'),
          providers: filteredMembers(search, 'providers'),
          window: windowWording(search, strips.now),
        })}
        updatedAt={updatedAt}
      />
      {accountStrips(strips, () => {
        void refreshedBalances(queryClient);
      })}
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
