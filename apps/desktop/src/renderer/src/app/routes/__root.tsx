import type { QueryClient } from '@tanstack/react-query';
import type { AnyRouter } from '@tanstack/react-router';
import type { ComponentType, ReactNode } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  useMatch,
  useNavigate,
  useParams,
  useRouter,
} from '@tanstack/react-router';
import { Suspense, lazy, useEffect, useState, useSyncExternalStore } from 'react';

import type { AccountKind } from '../../entities/account';
import type { UsageSearch } from '../../pages/usage';

import { AddProviderAct } from '../../pages/providers';
import {
  accountsQueryOptions,
  bindAccountChangesToCache,
  bindEngineLogsToCache,
  bindEngineStatesToCache,
  bindEngineTrafficToCache,
  bindSettingsToCache,
  engineStatesQueryOptions,
  gatewaysQueryOptions,
  settingsQueryOptions,
} from '../../shared/api';
import { sidebarHidden, subscribeToSidebarVisibility, useArrowWalk } from '../../shared/lib';
import { SidebarEdge, SidebarToggle } from '../../shared/ui';
import { CreateGatewaySheet } from '../../widgets/gateway/create';
import { useTitleBarDoubleClick } from '../lib/use-title-bar-double-click';
import { AppSidebar } from './-app-sidebar';
import { AppToolbar } from './-app-toolbar';
import { NotFound } from './-not-found';
import { surfaceRequest, withSheet, withoutSheet } from './-surface-request';
import { UsageFiltersAct } from './-usage-filters-act';
import { UsageRangeAct } from './-usage-range-act';
import { ViewCommandEar } from './-view-command-ear';

const noDevtools = () => null;

const Devtools: ComponentType<{ queryClient: QueryClient; router: AnyRouter }> =
  import.meta.env.DEV && import.meta.env.MODE !== 'test'
    ? lazy(async () => import('../devtools').then((module) => ({ default: module.AppDevtools })))
    : noDevtools;

export type RouterAppContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  validateSearch: surfaceRequest,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(gatewaysQueryOptions),
      context.queryClient.ensureQueryData(engineStatesQueryOptions),
      context.queryClient.ensureQueryData(accountsQueryOptions),
      context.queryClient.ensureQueryData(settingsQueryOptions),
    ]);
  },
  component: RootLayout,
  notFoundComponent: NotFound,
});

/** What the sidebar's band carries, which is nothing while a gateway's toolbar holds the control. */
function bandFor(slug: string | undefined): ReactNode {
  return slug === undefined ? <SidebarToggle where="chrome" /> : null;
}

/** The act the window strip carries over a providers screen, and nothing anywhere else. */
function providersAct(kind: AccountKind | undefined): ReactNode {
  return kind === undefined ? null : <AddProviderAct kind={kind} />;
}

/** The act the window strip carries over the usage screen, and nothing anywhere else. */
function usageAct(search: UsageSearch | undefined): ReactNode {
  return search === undefined ? null : <UsageRangeAct search={search} />;
}

/** The acts the window strip carries at its leading edge, which only usage stands any at. */
function leadingActs(search: UsageSearch | undefined): ReactNode {
  return search === undefined ? null : <UsageFiltersAct search={search} />;
}

/** Which act the current surface stands at the strip's trailing edge. */
function surfaceAct(search: UsageSearch | undefined, kind: AccountKind | undefined): ReactNode {
  return usageAct(search) ?? providersAct(kind);
}

function useWindowBand(sidebarAway: boolean): void {
  useEffect(() => {
    void window.recompose['system:window-band'](sidebarAway ? 'toolbar' : 'sidebar');
  }, [sidebarAway]);
}

/**
 * Points every push the main process makes at the query cache, for as long as the window stands.
 *
 * @summary A state push carries a whole snapshot, so the cache is written rather than reconciled
 * and a screen reads the same answer whether it asked or was told. A log push carries a run of rows
 * instead, which merges into what the cache already holds, because the engine buffer behind it
 * drains as it is read and a replace would take rows a person is reading.
 */
function usePushedCaches(queryClient: QueryClient): void {
  useEffect(() => bindEngineStatesToCache(queryClient), [queryClient]);
  useEffect(() => bindEngineTrafficToCache(queryClient), [queryClient]);
  useEffect(() => bindEngineLogsToCache(queryClient), [queryClient]);
  useEffect(() => bindAccountChangesToCache(queryClient), [queryClient]);
  useEffect(() => bindSettingsToCache(queryClient), [queryClient]);
}

function useDevtoolsAsked(): boolean {
  const [asked, setAsked] = useState(false);

  useEffect(
    () =>
      window.recomposeEvents['devtools:toggle'](() => {
        setAsked((standing) => !standing);
      }),
    [],
  );

  return asked;
}

function surfaceMain(
  slug: string | undefined,
  usageSearch: UsageSearch | undefined,
  providerKind: AccountKind | undefined,
): ReactNode {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-surface-content text-body">
      <AppToolbar
        leading={leadingActs(usageSearch)}
        slug={slug}
        trailing={surfaceAct(usageSearch, providerKind)}
      />
      <div className="relative flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </main>
  );
}

function RootLayout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const { create } = Route.useSearch();
  const { slug } = useParams({ strict: false });
  const providers = useMatch({ from: '/providers', shouldThrow: false });
  const usage = useMatch({ from: '/usage', shouldThrow: false });
  const sidebarAway = useSyncExternalStore(subscribeToSidebarVisibility, sidebarHidden);
  const devtoolsAsked = useDevtoolsAsked();

  useTitleBarDoubleClick();
  useArrowWalk();

  usePushedCaches(queryClient);
  useWindowBand(sidebarAway);

  return (
    <div className="flex h-full overflow-hidden">
      <ViewCommandEar />
      <AppSidebar
        away={sidebarAway}
        band={bandFor(slug)}
        onNewGateway={() => {
          void navigate({ to: '/', search: withSheet });
        }}
      />
      <SidebarEdge />
      {surfaceMain(slug, usage?.search, providers?.search.kind)}
      <CreateGatewaySheet
        onCreated={(slug) => {
          void navigate({ to: '/gateways/$slug', params: { slug }, search: {} });
        }}
        onOpenChange={(open) => {
          if (!open) {
            void navigate({ to: '.', search: withoutSheet, replace: true });
          }
        }}
        open={create === true}
      />
      {devtoolsAsked && (
        <Suspense>
          <Devtools queryClient={queryClient} router={router} />
        </Suspense>
      )}
    </div>
  );
}
