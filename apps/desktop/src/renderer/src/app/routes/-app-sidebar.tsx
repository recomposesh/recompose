import type { ReactNode } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router';
import { Suspense, useId, useSyncExternalStore } from 'react';

import { systemQueryOptions } from '../../shared/api';
import {
  bandAlignmentFor,
  focusDrivenByArrow,
  panelWidth,
  subscribeToPanelWidths,
} from '../../shared/lib';
import { Icon } from '../../shared/ui';
import { UpdateReadyCard } from '../../widgets/app-update';
import { GatewaySidebar } from '../../widgets/gateway/sidebar';
import { GetStartedPanel } from '../../widgets/get-started';
import { ProviderSidebar } from '../../widgets/provider/sidebar';

type AppSidebarProps = {
  /** Asked for when a person wants a gateway beyond the ones already listed. */
  onNewGateway: () => void;
  /** What the top band carries, which is the sidebar control on a surface holding no toolbar. */
  band?: ReactNode;
  /** Whether the person has put the sidebar away, which it leaves and returns along. */
  away: boolean;
};

/**
 * The shell's standing navigation, with the coaching checklist standing under it.
 *
 * @summary The width a person dragged to says how wide the sidebar stands, and the slot says
 * whether it stands at all, so the width is only spoken while the sidebar is here. Spoken over the
 * collapse it would outrank it, and the control that puts the sidebar away would leave it painted
 * while the toolbar cleared the window controls beside it.
 */
function sidebarWidth(): number {
  return panelWidth('sidebar');
}

function systemGroup(
  systemId: string,
  matchRoute: ReturnType<typeof useMatchRoute>,
  navigate: ReturnType<typeof useNavigate>,
): ReactNode {
  return (
    <div aria-labelledby={systemId} className="flex flex-col gap-px" role="group">
      <h2 className="nav-group" id={systemId}>
        System
      </h2>
      <Link
        className="nav-item"
        onFocus={() => {
          if (focusDrivenByArrow() && matchRoute({ to: '/usage' }) === false) {
            void navigate({ to: '/usage' });
          }
        }}
        to="/usage"
      >
        <Icon name="gauge" />
        Usage
      </Link>
      <Link
        className="nav-item"
        onFocus={() => {
          if (focusDrivenByArrow() && matchRoute({ to: '/settings' }) === false) {
            void navigate({ to: '/settings' });
          }
        }}
        to="/settings"
      >
        <Icon name="gear" />
        Settings
      </Link>
    </div>
  );
}

export function AppSidebar({ away, band, onNewGateway }: AppSidebarProps) {
  const systemId = useId();
  const width = useSyncExternalStore(subscribeToPanelWidths, sidebarWidth);
  const standing = away ? undefined : { width };
  const matchRoute = useMatchRoute();
  const navigate = useNavigate();
  const { data: system } = useSuspenseQuery(systemQueryOptions);

  return (
    <aside
      aria-label="Sidebar"
      className="sidebar-slot border-e border-line-subtle bg-surface-sidebar text-body text-ink-secondary"
      data-away={away ? '' : undefined}
      inert={away}
      style={standing}
    >
      <div className="app-drag flex h-full flex-col px-2.5 pb-2.5" style={{ width }}>
        <div
          className={`flex h-window-controls shrink-0 items-center ${bandAlignmentFor(system.windowControls)}`}
        >
          <span className="app-no-drag flex">{band}</span>
        </div>
        <nav className="app-no-drag flex flex-1 flex-col overflow-y-auto" data-focus-group="">
          <Suspense fallback={null}>
            <GatewaySidebar onNewGateway={onNewGateway} />
          </Suspense>
          <Suspense fallback={null}>
            <ProviderSidebar />
          </Suspense>
          {systemGroup(systemId, matchRoute, navigate)}
        </nav>
        <div className="app-no-drag flex flex-col gap-2.5 pt-2.5">
          <Suspense fallback={null}>
            <GetStartedPanel />
          </Suspense>
          <Suspense fallback={null}>
            <UpdateReadyCard />
          </Suspense>
        </div>
      </div>
    </aside>
  );
}
