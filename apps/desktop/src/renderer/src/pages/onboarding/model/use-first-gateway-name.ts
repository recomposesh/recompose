import { useQuery } from '@tanstack/react-query';

import { gatewaysQueryOptions } from '../../../shared/api';
import { freeGatewayName } from './first-gateway-name';

/**
 * The name setup's gateway will stand under, read against what the machine already stores.
 *
 * @summary The compose step and the run both read it, so the name a person is shown is the name
 * that reaches disk. A list still in flight reads as empty, which is the same answer a machine
 * with no gateways gives, and the run reads it again after the list has landed.
 */
export function useFirstGatewayName(): string {
  const { data: stored } = useQuery(gatewaysQueryOptions);

  return freeGatewayName(new Set((stored ?? []).map((gateway) => gateway.displayName)));
}
