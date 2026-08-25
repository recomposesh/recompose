import type { GatewayConfig } from '@recompose/contracts';

import { DEFAULT_GATEWAY_BIND_ADDRESS, routableGatewayOrigin } from '@recompose/contracts';
import { useSuspenseQuery } from '@tanstack/react-query';

import { clientNamed } from '../../../../entities/harness';
import { settingsQueryOptions } from '../../../../shared/api';
import { WaitingStep } from '../waiting-step/waiting-step';

type WaitingStandingProps = {
  /** The gateway setup built, or nothing where a person reached this step on a stored one. */
  gateway: GatewayConfig | undefined;
  /** The harnesses the person picked, by catalog id. */
  harnesses: ReadonlySet<string>;
  /** Steps back to the commands. */
  onShowCommands: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

/**
 * The wait, standing over the address a harness sends to.
 *
 * @summary Nothing here watches for the request. The wizard resolves when the profile records a
 * served one, which is a reading of what the gateway wrote down rather than a second observer of
 * the same traffic.
 */
export function WaitingStanding({
  gateway,
  harnesses,
  onShowCommands,
  onSkip,
}: WaitingStandingProps) {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const bindAddress = settings.bindAddress ?? DEFAULT_GATEWAY_BIND_ADDRESS;

  return (
    <WaitingStep
      address={gateway === undefined ? '' : routableGatewayOrigin(bindAddress, gateway.port)}
      harnesses={[...harnesses].map((id) => clientNamed(id).name)}
      onShowCommands={onShowCommands}
      onSkip={onSkip}
    />
  );
}
