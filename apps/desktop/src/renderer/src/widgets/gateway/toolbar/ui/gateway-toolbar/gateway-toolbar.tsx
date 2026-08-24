import {
  DEFAULT_GATEWAY_BIND_ADDRESS,
  type GatewayEngineState,
  routableGatewayOrigin,
} from '@recompose/contracts';
import { useSuspenseQuery } from '@tanstack/react-query';

import {
  engineStatesQueryOptions,
  gatewayStateIn,
  gatewaysQueryOptions,
  settingsQueryOptions,
  systemQueryOptions,
} from '../../../../../shared/api';
import { useGatewayLifecycle } from '../../lib/use-gateway-lifecycle';
import { ToolbarFooter } from '../toolbar-footer/toolbar-footer';
import { ToolbarStrip } from '../toolbar-strip/toolbar-strip';

type GatewayToolbarProps = {
  /** Which gateway the toolbar acts on, which is always the selected one. */
  slug: string;
};

function failedStartIn(state: GatewayEngineState): { port: number } | undefined {
  return state.status === 'stopped' ? state.failure : undefined;
}

/**
 * The address of the selected gateway, the way to copy it, and the control that runs it.
 *
 * @summary Reach for it in the app shell's toolbar strip. Every control here reaches the one
 * gateway the person selected and never a second one.
 */
export function GatewayToolbar({ slug }: GatewayToolbarProps) {
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: states } = useSuspenseQuery(engineStatesQueryOptions);
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { data: system } = useSuspenseQuery(systemQueryOptions);
  const lifecycle = useGatewayLifecycle(slug);
  const gateway = gateways.find((held) => held.slug === slug);

  if (gateway === undefined) {
    return null;
  }

  const { moveToFreePort: onMoveToFreePort } = lifecycle;
  const state = gatewayStateIn(states, slug);
  const running = state.status === 'running';
  const bindAddress = settings.bindAddress ?? DEFAULT_GATEWAY_BIND_ADDRESS;

  return (
    <div className="flex flex-col gap-2">
      <ToolbarStrip
        address={routableGatewayOrigin(bindAddress, gateway.port)}
        name={gateway.displayName}
        onRun={running ? lifecycle.stop : lifecycle.start}
        port={gateway.port}
        running={running}
        status={state.status}
        windowControls={system.windowControls}
      />
      <ToolbarFooter
        attempt={lifecycle.attempt}
        failure={failedStartIn(state)}
        onMoveToFreePort={onMoveToFreePort}
        refusal={lifecycle.refusal}
      />
    </div>
  );
}
