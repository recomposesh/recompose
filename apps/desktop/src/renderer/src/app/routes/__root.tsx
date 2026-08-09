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

import { AddProviderAct } from '../../pages/providers';
import {
  accountsQueryOptions,
  bindAccountChangesToCache,
  bindEngineStatesToCache,
  bindEngineTrafficToCache,
  bindSettingsToCache,
  engineStatesQueryOptions,
  gatewaysQueryOptions,
  settingsQueryOptions,
} from '../../shared/api';
import { sidebarHidden, subscribeToSidebarVisibility } from '../../shared/lib';
import { SidebarEdge, SidebarToggle } from '../../shared/ui';
import { CreateGatewaySheet } from '../../widgets/gateway/create';
import { StatusBar } from '../../widgets/status-bar';
import { useTitleBarDoubleClick } from '../lib/use-title-bar-double-click';
import { AppSidebar } from './-app-sidebar';
import { AppToolbar } from './-app-toolbar';
import { NotFound } from './-not-found';
import { surfaceRequest, withSheet, withoutSheet } from './-surface-request';

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

function useWindowBand(sidebarAway: boolean): void {
  useEffect(() => {
    void window.recompose['system:window-band'](sidebarAway ? 'toolbar' : 'sidebar');
  }, [sidebarAway]);
}

/**
 * Points every push the main process makes at the query cache, for as long as the window stands.
 *
 * @summary Each push carries a whole snapshot, so the cache is written rather than reconciled and
 * a screen reads the same answer whether it asked or was told.
 */
function usePushedCaches(queryClient: QueryClient): void {
  useEffect(() => bindEngineStatesToCache(queryClient), [queryClient]);
  useEffect(() => bindEngineTrafficToCache(queryClient), [queryClient]);
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

function RootLayout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const { create } = Route.useSearch();
  const { slug } = useParams({ strict: false });
  const providers = useMatch({ from: '/providers', shouldThrow: false });
  const sidebarAway = useSyncExternalStore(subscribeToSidebarVisibility, sidebarHidden);
  const devtoolsAsked = useDevtoolsAsked();

  useTitleBarDoubleClick();

  usePushedCaches(queryClient);
  useWindowBand(sidebarAway);

  return (
    <div className="flex h-full overflow-hidden">
      <AppSidebar
        away={sidebarAway}
        band={bandFor(slug)}
        onNewGateway={() => {
          void navigate({ to: '/', search: withSheet });
        }}
      />
      <SidebarEdge />
      <main className="relative flex flex-1 flex-col overflow-hidden bg-surface-content text-body">
        <AppToolbar slug={slug} trailing={providersAct(providers?.search.kind)} />
        <div className="relative flex-1 overflow-y-auto">
          <Outlet />
        </div>
        {slug !== undefined && <StatusBar />}
      </main>
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
