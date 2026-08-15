import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';

import {
  engineStatesQueryOptions,
  gatewayStateIn,
  gatewaysQueryOptions,
} from '../../../../../shared/api';
import { focusDrivenByArrow } from '../../../../../shared/lib';
import { Icon, NavGroup, StatusIndicator } from '../../../../../shared/ui';

type GatewaySidebarProps = {
  /** Asked for when a person wants a gateway beyond the ones already listed. */
  onNewGateway: () => void;
};

const GATEWAY_PATH = '/gateways/';

function gatewaySlugInPath(pathname: string): string | undefined {
  return pathname.startsWith(GATEWAY_PATH)
    ? decodeURIComponent(pathname.slice(GATEWAY_PATH.length))
    : undefined;
}

/**
 * The way to the next gateway, over the stored ones, each row reporting whether it serves.
 *
 * @summary Reach for it in the app shell's sidebar. The group stands whether or not a gateway
 * exists, so a fresh install still shows where gateways will land and how to make the first.
 */
export function GatewaySidebar({ onNewGateway }: GatewaySidebarProps) {
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: states } = useSuspenseQuery(engineStatesQueryOptions);
  const standingOn = useRouterState({
    select: (state) => gatewaySlugInPath(state.location.pathname),
  });
  const navigate = useNavigate();

  return (
    <NavGroup title="Local gateways">
      {gateways.map((gateway) => (
        <Link
          data-panel-control=""
          className="nav-item"
          key={gateway.slug}
          onFocus={() => {
            if (focusDrivenByArrow() && gateway.slug !== standingOn) {
              void navigate({ to: '/gateways/$slug', params: { slug: gateway.slug } });
            }
          }}
          params={{ slug: gateway.slug }}
          to="/gateways/$slug"
        >
          <Icon className="size-4 text-gateway" name="network" />
          <span className="truncate">{gateway.displayName}</span>{' '}
          <span className="ms-auto flex">
            <StatusIndicator status={gatewayStateIn(states, gateway.slug).status} />
          </span>
        </Link>
      ))}
      <button className="nav-item-action text-start" onClick={onNewGateway} type="button">
        <Icon className="size-3.5 icon-emphasis" name="plus" />
        New gateway…
      </button>
    </NavGroup>
  );
}
