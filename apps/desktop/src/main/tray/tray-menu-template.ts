import type { EngineStates } from '@recompose/contracts';

import type { TrayGateway, TrayLifecycleIcons, TrayMenuItem } from './gateway-lifecycle-submenu';

import { gatewayLifecycleSubmenu } from './gateway-lifecycle-submenu';

export type {
  TrayGateway,
  TrayIconSource,
  TrayLifecycleIcons,
  TrayMenuItem,
} from './gateway-lifecycle-submenu';

export type TrayMenuHandlers = {
  onOpenWindow: () => void;
  onOpenSettings: () => void;
  onOpenDevtools: () => void;
  onQuit: () => void;
  onStartGateway: (slug: string) => void;
  onStopGateway: (slug: string) => void;
  onRestartGateway: (slug: string) => void;
};

export type TrayMenuInput = {
  handlers: TrayMenuHandlers;
  icons: TrayLifecycleIcons;
  gateways: readonly TrayGateway[];
  states: EngineStates;
  development: boolean;
};

function gatewaySection(input: TrayMenuInput): TrayMenuItem[] {
  if (input.gateways.length === 0) {
    return [{ label: 'No gateways yet', enabled: false }, { type: 'separator' as const }];
  }

  return [
    ...input.gateways.map((gateway) => ({
      label: gateway.displayName,
      submenu: gatewayLifecycleSubmenu(gateway, input.states, input.handlers, input.icons),
    })),
    { type: 'separator' as const },
  ];
}

function developmentSection(input: TrayMenuInput): TrayMenuItem[] {
  if (!input.development) {
    return [];
  }

  return [{ label: 'TanStack Devtools', click: input.handlers.onOpenDevtools }];
}

export function buildTrayMenuTemplate(input: TrayMenuInput): TrayMenuItem[] {
  const { handlers } = input;

  return [
    ...gatewaySection(input),
    { label: 'Open recompose', click: handlers.onOpenWindow },
    { label: 'Settings…', click: handlers.onOpenSettings },
    ...developmentSection(input),
    { type: 'separator' },
    { label: 'Quit recompose', click: handlers.onQuit },
  ];
}
