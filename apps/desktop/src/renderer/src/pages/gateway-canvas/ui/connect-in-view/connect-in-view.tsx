import type { GatewayConfig } from '@recompose/contracts';

import { DEFAULT_GATEWAY_BIND_ADDRESS, enforcedApiKey } from '@recompose/contracts';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import type { ConnectFacts } from '../../model/connect-facts';

import {
  engineLogsQueryOptions,
  gatewaysQueryOptions,
  settingsQueryOptions,
} from '../../../../shared/api';
import {
  closeConnectSheet,
  connectSheetOpen,
  subscribeToConnectSheetVisibility,
} from '../../../../shared/lib';
import { ConnectSheet } from '../connect-sheet/connect-sheet';

type ConnectInViewProps = {
  /** The gateway the route selected, which every fact in the sheet is read from. */
  slug: string;
};

function factsOf(gateway: GatewayConfig, bindAddress: string): ConnectFacts {
  return {
    gatewayName: gateway.displayName,
    baseUrl: `http://${bindAddress}:${String(gateway.port)}`,
    apiKey: enforcedApiKey(gateway),
    modelId: gateway.virtualModels[0]?.id,
  };
}

/**
 * The connect sheet, standing over the canvas whenever the toolbar control asks for it.
 *
 * @summary Reach for it from the gateway page rather than from the toolbar, because the sheet
 * covers the page while the control lives in the window chrome above it. Every fact it hands a
 * client comes from the stored gateway, so a port moved or a key replaced reaches the blocks with
 * no second place to update.
 */
export function ConnectInView({ slug }: ConnectInViewProps) {
  const shown = useSyncExternalStore(subscribeToConnectSheetVisibility, connectSheetOpen);
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { data: rows } = useQuery(engineLogsQueryOptions(slug));
  const gateway = gateways.find((held) => held.slug === slug);

  if (gateway === undefined) {
    return null;
  }

  return (
    <ConnectSheet
      answered={rows?.length ?? 0}
      facts={factsOf(gateway, settings.bindAddress ?? DEFAULT_GATEWAY_BIND_ADDRESS)}
      models={gateway.virtualModels}
      onOpenChange={closeConnectSheet}
      open={shown}
    />
  );
}
