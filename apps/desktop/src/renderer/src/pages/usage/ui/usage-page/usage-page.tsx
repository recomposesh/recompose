import type { QueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type { ScopeLevel, UsageSearch } from '../../lib/usage-search';
import type { UsageStrips, UsageView } from './use-usage-view';

import {
  balancesQueryOptions,
  quotaWindowsQueryOptions,
  refreshedBalances,
} from '../../../../shared/api';
import { Button, ScopePath } from '../../../../shared/ui';
import { narrowedScope, spendSnappedRange } from '../../lib/usage-search';
import { BalanceCard } from '../balance-card/balance-card';
import { BreakdownTable } from '../breakdown-table/breakdown-table';
import { MetricTiles } from '../metric-tiles/metric-tiles';
import { QuotaStrip } from '../quota-strip/quota-strip';
import { UsageChart } from '../usage-chart/usage-chart';
import { breakdownFacesOf, movedSearch, nextLevelAfter, truncatedSearch } from './usage-page-moves';
import { useUsageView } from './use-usage-view';

type UsagePageProps = {
  /** The typed view the address carries. */
  search: UsageSearch;
  /** Receives the whole next view whenever a control moves it. */
  onSearchChange: (next: UsageSearch) => void;
};

type Refusal = { range: UsageSearch['range']; failure: string };

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

function refusalCard(refusal: Refusal, retry: () => void) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line-subtle bg-surface-card px-4 py-3">
      <p className="text-body text-danger-ink">{refusal.failure}</p>
      <Button onPress={retry} variant="secondary">
        Retry
      </Button>
    </div>
  );
}

function scopedEmptyCard(sentence: string, clearScope: () => void, widenRange: () => void) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line-subtle bg-surface-card px-6 py-10 text-center">
      <p className="text-body text-ink">{sentence}</p>
      <div className="flex gap-2">
        <Button onPress={clearScope} variant="secondary">
          Clear scope
        </Button>
        <Button onPress={widenRange} variant="secondary">
          Widen range
        </Button>
      </div>
    </div>
  );
}

type ReadingsProps = {
  view: Extract<UsageView, { state: 'readings' | 'loading' }>;
  search: UsageSearch;
  level: ScopeLevel;
  onLevelChange: (level: ScopeLevel) => void;
  onSearchChange: (next: UsageSearch) => void;
  tableOpen: boolean;
  onTableOpenChange: (open: boolean) => void;
};

function readingsBody({
  view,
  search,
  level,
  onLevelChange,
  onSearchChange,
  tableOpen,
  onTableOpenChange,
}: ReadingsProps) {
  const metricLabel = search.metric[0]?.toUpperCase() ?? '';

  return (
    <>
      <MetricTiles
        faces={view.faces}
        metric={search.metric}
        onMetricChange={(metric) => {
          onSearchChange({
            ...search,
            metric,
            range: metric === 'spend' ? spendSnappedRange(search.range) : search.range,
          });
        }}
      />
      {view.state === 'readings' ? (
        <UsageChart
          caption={view.caption}
          drawn={view.chart}
          edgeAt={view.edgeAt}
          label={`${metricLabel}${search.metric.slice(1)} chart`}
          onTableOpenChange={onTableOpenChange}
          tableOpen={tableOpen}
        />
      ) : null}
      {view.state === 'readings' ? (
        <BreakdownTable
          level={level}
          onDrill={(key) => {
            onSearchChange({ ...search, [level]: key });
            onLevelChange(nextLevelAfter(level));
          }}
          onLevelChange={onLevelChange}
          rows={breakdownFacesOf(view, level)}
          spendColumn={view.spendColumn}
        />
      ) : null}
    </>
  );
}

type Moves = Omit<ReadingsProps, 'view'>;

function explorerBody(view: UsageView, strips: UsageStrips, moves: Moves, onRefresh: () => void) {
  const { search, onSearchChange } = moves;

  return (
    <>
      <ScopePath
        onTruncate={(keptCount) => {
          onSearchChange(truncatedSearch(search, keptCount));
        }}
        rootLabel="All traffic"
        segments={narrowedScope(search).map((one) => ({
          key: `${one.level}:${one.value}`,
          label: one.value,
        }))}
      />
      <QuotaStrip accountNameOf={strips.accountNameOf} now={strips.now} windows={strips.windows} />
      <BalanceCard
        accountNameOf={strips.accountNameOf}
        balances={strips.balances}
        now={strips.now}
        onRefresh={onRefresh}
      />
      {view.state === 'scoped-empty'
        ? scopedEmptyCard(
            view.sentence,
            () => {
              onSearchChange(truncatedSearch(search, narrowedScope(search).length - 1));
            },
            () => {
              onSearchChange({ ...search, range: '30d' });
            },
          )
        : null}
      {view.state === 'readings' || view.state === 'loading'
        ? readingsBody({ ...moves, view })
        : null}
    </>
  );
}

/**
 * The one usage explorer: tiles headline the window, the selected tile drives the chart, and the
 * breakdown drills the domain hierarchy.
 *
 * @summary Every reading also exists as printed text, missing data reads as missing rather than
 * as zero, and the whole view lives in the address so a reload lands on the same screen.
 */
function refreshedUsageReadings(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ['usage-report'] });
  void queryClient.invalidateQueries({ queryKey: quotaWindowsQueryOptions.queryKey });
  void queryClient.invalidateQueries({ queryKey: balancesQueryOptions.queryKey });
}

type MenuSeams = {
  search: UsageSearch;
  onSearchChange: (next: UsageSearch) => void;
  queryClient: QueryClient;
  setTableOpen: Dispatch<SetStateAction<boolean>>;
};

function useMenuCommands({ search, onSearchChange, queryClient, setTableOpen }: MenuSeams): void {
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

export function UsagePage({ search, onSearchChange }: UsagePageProps) {
  const queryClient = useQueryClient();
  const { view, strips } = useUsageView(search);
  const [level, setLevel] = useState<ScopeLevel>('gateway');
  const [tableOpen, setTableOpen] = useState(false);
  const [refusal, setRefusal] = useState<Refusal | undefined>();
  const noted = useRef(false);

  useEffect(() => {
    if (view.state === 'refused' && !noted.current) {
      noted.current = true;
      setRefusal({ range: search.range, failure: view.failure });
      onSearchChange({ ...search, range: '1h' });
    }
  }, [view, search, onSearchChange]);

  useMenuCommands({ search, onSearchChange, queryClient, setTableOpen });

  useEffect(() => {
    void window.recompose['system:usage-table']({ open: tableOpen });
  }, [tableOpen]);

  const moves: Moves = {
    search,
    level,
    onLevelChange: setLevel,
    onSearchChange,
    tableOpen,
    onTableOpenChange: setTableOpen,
  };
  const retry = () => {
    noted.current = false;
    setRefusal(undefined);
    onSearchChange({ ...search, range: refusal?.range ?? search.range });
  };

  return (
    <section
      className="mx-auto flex w-full max-w-data-column flex-col gap-5 px-6 pt-page-top pb-6"
      data-focus-group=""
    >
      <h1 className="text-title text-ink">Usage</h1>
      {refusal === undefined ? null : refusalCard(refusal, retry)}
      {view.state === 'promise'
        ? promiseCard()
        : explorerBody(view, strips, moves, () => {
            void refreshedBalances(queryClient);
          })}
    </section>
  );
}
