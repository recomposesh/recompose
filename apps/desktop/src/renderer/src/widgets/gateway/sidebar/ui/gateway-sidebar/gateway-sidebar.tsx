import type { GatewayEngineState } from '@recompose/contracts';
import type { ReactElement } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';

import type { MenuAction } from '../../../../../shared/ui';

import {
  engineStatesQueryOptions,
  gatewayStateIn,
  gatewaysQueryOptions,
  useStartGateway,
  useStopGateway,
} from '../../../../../shared/api';
import { focusDrivenByArrow } from '../../../../../shared/lib';
import { ContextMenu, Icon, NavGroup, StatusIndicator } from '../../../../../shared/ui';

type GatewaySidebarProps = {
  /** Asked for when a person wants a gateway beyond the ones already listed. */
  onNewGateway: () => void;
};

type GatewayLifecycleActs = {
  start: (slug: string) => void;
  stop: (slug: string) => void;
};

const GATEWAY_PATH = '/gateways/';

function gatewaySlugInPath(pathname: string): string | undefined {
  return pathname.startsWith(GATEWAY_PATH)
    ? decodeURIComponent(pathname.slice(GATEWAY_PATH.length))
    : undefined;
}

/**
 * What a row offers a right-click, which is the pair of acts that run the gateway it names.
 *
 * @summary Both acts stand on every row and the serving state decides which one answers, the way
 * the tray and the Gateway menu already draw them. A row whose act came and went would move the
 * other one under the pointer between one glance and the next. Each act carries the slug of the
 * row it came from, so a gateway nobody selected still starts from its own row.
 */
function lifecycleActs(slug: string, serving: boolean, acts: GatewayLifecycleActs): MenuAction[] {
  return [
    {
      label: 'Start',
      icon: 'play',
      tone: 'positive',
      disabled: serving,
      onSelect: () => {
        acts.start(slug);
      },
    },
    {
      label: 'Stop',
      icon: 'stop',
      disabled: !serving,
      onSelect: () => {
        acts.stop(slug);
      },
    },
  ];
}

/**
 * One stored gateway, standing as the way to it and as the pair of acts that run it.
 *
 * @summary The row is the link itself rather than a box around one, so the sidebar keeps the
 * layout and the keyboard order it already had while a right-click still reaches the acts.
 */
function gatewayRow(
  gateway: { slug: string; displayName: string },
  status: GatewayEngineState['status'],
  acts: GatewayLifecycleActs,
  reveal: (slug: string) => void,
): ReactElement {
  return (
    <ContextMenu
      items={lifecycleActs(gateway.slug, status === 'running', acts)}
      key={gateway.slug}
      render={
        <Link
          data-panel-control=""
          className="nav-item"
          onFocus={() => {
            reveal(gateway.slug);
          }}
          params={{ slug: gateway.slug }}
          to="/gateways/$slug"
        />
      }
    >
      <Icon className="size-4 text-gateway" name="network" />
      <span className="truncate">{gateway.displayName}</span>{' '}
      <span className="ms-auto flex">
        <StatusIndicator status={status} />
      </span>
    </ContextMenu>
  );
}

/**
 * The way to the next gateway, over the stored ones, each row reporting whether it serves.
 *
 * @summary Reach for it in the app shell's sidebar. The group stands whether or not a gateway
 * exists, so a fresh install still shows where gateways will land and how to make the first. A
 * right-click on a row runs the gateway that row names rather than the one standing, which is what
 * the tray already offers from outside the window.
 */
export function GatewaySidebar({ onNewGateway }: GatewaySidebarProps) {
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: states } = useSuspenseQuery(engineStatesQueryOptions);
  const standingOn = useRouterState({
    select: (state) => gatewaySlugInPath(state.location.pathname),
  });
  const navigate = useNavigate();
  const reveal = (slug: string): void => {
    if (focusDrivenByArrow() && slug !== standingOn) {
      void navigate({ to: '/gateways/$slug', params: { slug } });
    }
  };
  const startGateway = useStartGateway();
  const stopGateway = useStopGateway();

  const acts: GatewayLifecycleActs = {
    start: (slug) => {
      startGateway.mutate({ slug });
    },
    stop: (slug) => {
      stopGateway.mutate({ slug });
    },
  };

  return (
    <NavGroup title="Local gateways">
      {gateways.map((gateway) =>
        gatewayRow(gateway, gatewayStateIn(states, gateway.slug).status, acts, reveal),
      )}
      <button className="nav-item-action text-start" onClick={onNewGateway} type="button">
        <Icon className="size-3.5 icon-emphasis" name="plus" />
        New gateway…
      </button>
    </NavGroup>
  );
}
