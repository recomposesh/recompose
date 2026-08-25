import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type { SetupStep } from './setup-step';

import { gatewaysQueryOptions, settingsQueryOptions, useSettingsWriter } from '../../../shared/api';
import { setupOpensOn } from './setup-step';

type SetupStanding = {
  /** The step setup stands on, or nothing while setup stands away. */
  step: SetupStep | null;
  /** Moves setup on to the named step, for as long as this session lasts. */
  walkTo: (step: SetupStep) => void;
  /** Records that setup is over, whether it finished or the person left it. */
  settle: () => void;
};

/**
 * Where setup stands for this profile, and the two ways it moves.
 *
 * @summary The opening step is read once, on the first render that has the profile, and never
 * again. Deriving it on every render would walk a person backwards the moment something behind
 * setup was deleted, which is a change of context they never asked for. Everything after the
 * opening is this session's own memory, and none of it reaches disk: what disk holds is whether
 * setup is over, so a relaunch reads the profile again rather than a remembered position.
 */
export function useSetupStanding(): SetupStanding {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { save } = useSettingsWriter();

  const [step, setStep] = useState<SetupStep | null>(() =>
    setupOpensOn({
      settled: settings.setupWizardSettled,
      gatewayExists: gateways.length > 0,
      virtualModelComposed: gateways.some((gateway) => gateway.virtualModels.length > 0),
    }),
  );

  return {
    step: settings.setupWizardSettled ? null : step,
    walkTo: setStep,
    settle: () => {
      setStep(null);
      save({ setupWizardSettled: true });
    },
  };
}
