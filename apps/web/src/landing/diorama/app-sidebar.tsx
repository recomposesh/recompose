import { Box, Gauge, Key, Monitor, Plus, RotateCw, Settings, Share2 } from 'lucide-react';

import { GroupLabel } from './group-label';
import { SidebarCount } from './sidebar-count';
import { SidebarRow } from './sidebar-row';

export function AppSidebar() {
  return (
    <aside className="absolute inset-y-0 inset-s-0 w-60 border-e border-win-line bg-win-sidebar">
      <div className="flex h-9 items-center gap-2 px-3.5">
        <span className="size-3 rounded-full bg-traffic-close" />
        <span className="size-3 rounded-full bg-traffic-hold" />
        <span className="size-3 rounded-full bg-traffic-go" />
      </div>

      <nav className="flex flex-col px-2.5">
        <GroupLabel>Local gateways</GroupLabel>
        <SidebarRow
          icon={<Share2 className="size-4 text-gateway" />}
          label="coding"
          active
          trailing={<span className="size-1.5 rounded-full bg-live" />}
        />
        <SidebarRow
          icon={<Plus className="size-3.5 text-accent-ink" />}
          label="New gateway…"
          accent
        />

        <GroupLabel>Providers</GroupLabel>
        <SidebarRow
          icon={<RotateCw className="size-4 text-subscription" />}
          label="Subscriptions"
          trailing={<SidebarCount value="4" />}
        />
        <SidebarRow
          icon={<Key className="size-4 text-api-key" />}
          label="API keys"
          trailing={<SidebarCount value="1" />}
        />
        <SidebarRow
          icon={<Box className="size-4 text-aggregator" />}
          label="Aggregators"
          trailing={<SidebarCount value="1" />}
        />
        <SidebarRow
          icon={<Monitor className="size-4 text-local-runtime" />}
          label="Local runtimes"
          trailing={<SidebarCount value="1" />}
        />

        <GroupLabel>System</GroupLabel>
        <SidebarRow icon={<Gauge className="size-4 text-win-ink" />} label="Usage" />
        <SidebarRow icon={<Settings className="size-4 text-win-ink" />} label="Settings" />
      </nav>
    </aside>
  );
}
