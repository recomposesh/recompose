import type { GatewayConfig } from '@recompose/contracts';

import { DEFAULT_GATEWAY_BIND_ADDRESS } from '@recompose/contracts';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { clientNamed, connectFactsFor } from '../../../../entities/harness';
import { settingsQueryOptions } from '../../../../shared/api';
import { PointingStep } from '../pointing-step/pointing-step';

type PointingStandingProps = {
  /** The gateway setup built, which every line is written from. */
  gateway: GatewayConfig;
  /** The harnesses the person picked, by catalog id. */
  harnesses: ReadonlySet<string>;
  /** Steps back to the run that built the gateway. */
  onBack: () => void;
  /** Carries the person on to the wait. */
  onConnected: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

/**
 * The pointing step, standing over the gateway setup just built.
 *
 * @summary Which entry stands open is this session's own memory and never reaches disk: it says
 * where a person is looking rather than what they have done, and a relaunch that reopened the
 * third block would be guessing.
 */
export function PointingStanding({
  gateway,
  harnesses,
  onBack,
  onConnected,
  onSkip,
}: PointingStandingProps) {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const clients = [...harnesses].map(clientNamed);
  const [openId, setOpenId] = useState(clients[0]?.id ?? '');

  return (
    <PointingStep
      clients={clients}
      facts={connectFactsFor(gateway, settings.bindAddress ?? DEFAULT_GATEWAY_BIND_ADDRESS)}
      onBack={onBack}
      onConnected={onConnected}
      onOpen={setOpenId}
      onSkip={onSkip}
      openId={openId}
    />
  );
}
