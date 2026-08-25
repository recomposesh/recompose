import type { GatewayConfig } from '@recompose/contracts';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type { SetupStep } from './setup-step';

import { gatewaysQueryOptions, settingsQueryOptions, useSettingsWriter } from '../../../shared/api';
import { subscribeToSetupReopened } from './reopen-setup';
import { setupOpensOn } from './setup-step';

type SetupStanding = {
  /** The step setup stands on, or nothing while setup stands away. */
  step: SetupStep | null;
  /** Whether setup ended this session on a request the gateway served. */
  served: boolean;
  /** Puts the celebration away, which only a person does. */
  onCelebrated: () => void;
  /** Moves setup on to the named step, for as long as this session lasts. */
  walkTo: (step: SetupStep) => void;
  /** Records that setup is over, whether it finished or the person left it. */
  settle: () => void;
};

/** What a profile already holds, which is the whole of what the opening step reads. */
function whatStands(gateways: readonly GatewayConfig[]) {
  return {
    gatewayExists: gateways.length > 0,
    virtualModelComposed: gateways.some((gateway) => gateway.virtualModels.length > 0),
  };
}

/**
 * Where setup stands for this profile, and the two ways it moves.
 *
 * @summary The opening step is read once, on the first render that has the profile, and never
 * again. Deriving it on every render would walk a person backwards the moment something behind
 * setup was deleted, which is a change of context they never asked for. Everything after the
 * opening is this session's own memory, and none of it reaches disk: what disk holds is whether
 * setup is over, so a relaunch reads the profile again rather than a remembered position.
 *
 * The one thing that settles setup without a person pressing anything is a request the gateway
 * served, which arrives as a push onto the profile. It only settles the step that waits for it: a
 * profile that served a request years ago must not close a wizard somebody just reopened from the
 * menu to look at.
 */
export function useSetupStanding(): SetupStanding {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { save } = useSettingsWriter();
  const gatewaysNow = useRef(gateways);

  gatewaysNow.current = gateways;

  const [step, setStep] = useState<SetupStep | null>(() =>
    setupOpensOn({ settled: settings.setupWizardSettled, ...whatStands(gateways) }),
  );
  const [servedBefore, setServedBefore] = useState(settings.firstRequestServed);
  const [served, setServed] = useState(false);

  useEffect(
    () =>
      subscribeToSetupReopened(() => {
        setServed(false);
        setStep(setupOpensOn({ settled: false, ...whatStands(gatewaysNow.current) }));
        save({ setupWizardSettled: false });
      }),
    [save],
  );

  if (servedBefore !== settings.firstRequestServed) {
    setServedBefore(settings.firstRequestServed);

    if (settings.firstRequestServed && step === 'waiting') {
      setStep(null);
      setServed(true);
      save({ setupWizardSettled: true });
    }
  }

  return {
    step: settings.setupWizardSettled ? null : step,
    served,
    onCelebrated: () => {
      setServed(false);
    },
    walkTo: setStep,
    settle: () => {
      setStep(null);
      save({ setupWizardSettled: true });
    },
  };
}
