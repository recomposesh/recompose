import type { EngineStates } from '@recompose/contracts';

export type TrayIconSource = {
  source: string;
  retinaSource: string;
};

export type TrayLifecycleIcons = {
  start: TrayIconSource;
  stop: TrayIconSource;
  restart: TrayIconSource;
};

export type TrayGateway = {
  slug: string;
  displayName: string;
};

export type TrayMenuItem = {
  label?: string;
  type?: 'separator';
  enabled?: boolean;
  icon?: TrayIconSource;
  click?: () => void;
  submenu?: TrayMenuItem[];
};

export type GatewayLifecycleHandlers = {
  onStartGateway: (slug: string) => void;
  onStopGateway: (slug: string) => void;
  onRestartGateway: (slug: string) => void;
};

export type LifecycleAvailability = {
  start: boolean;
  stop: boolean;
  restart: boolean;
};

export function gatewayServingIn(states: EngineStates, slug: string): boolean {
  return states[slug]?.status === 'running';
}

export function lifecycleAvailabilityFor(serving: boolean): LifecycleAvailability {
  return { start: !serving, stop: serving, restart: serving };
}

function lifecycleRow(
  label: string,
  enabled: boolean,
  click: () => void,
  icon: TrayIconSource | undefined,
): TrayMenuItem {
  return { label, enabled, click, ...(icon === undefined ? {} : { icon }) };
}

/**
 * The per-gateway lifecycle submenu the tray, the Gateway menu, and the Dock all read.
 *
 * @summary One module holds the serving rule, the availability law, and the submenu shape, so the
 * three surfaces can't drift. Icons stay optional because the Dock consumes the same shape bare.
 */
export function gatewayLifecycleSubmenu(
  gateway: TrayGateway,
  states: EngineStates,
  handlers: GatewayLifecycleHandlers,
  icons?: TrayLifecycleIcons,
): TrayMenuItem[] {
  const availability = lifecycleAvailabilityFor(gatewayServingIn(states, gateway.slug));

  return [
    lifecycleRow(
      'Start',
      availability.start,
      () => {
        handlers.onStartGateway(gateway.slug);
      },
      icons?.start,
    ),
    lifecycleRow(
      'Stop',
      availability.stop,
      () => {
        handlers.onStopGateway(gateway.slug);
      },
      icons?.stop,
    ),
    lifecycleRow(
      'Restart',
      availability.restart,
      () => {
        handlers.onRestartGateway(gateway.slug);
      },
      icons?.restart,
    ),
  ];
}
