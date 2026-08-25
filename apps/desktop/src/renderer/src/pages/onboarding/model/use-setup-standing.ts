import type { GatewayConfig, GatewayTraffic } from '@recompose/contracts';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import type { SetupStep } from './setup-step';

import {
  engineTrafficQueryOptions,
  gatewaysQueryOptions,
  settingsQueryOptions,
  useSettingsWriter,
} from '../../../shared/api';
import { subscribeToSetupReopened } from './reopen-setup';
import { lastServedAt, servedSince } from './served-since';
import { setupOpensOn } from './setup-step';

type SetupStanding = {
  /** The step setup stands on, or nothing while setup stands away. */
  step: SetupStep | null;
  /** Watches the gateway setup built for the request that ends the wait. */
  waitOn: (slug: string) => void;
  /** Whether setup ended this session on a request the gateway served. */
  served: boolean;
  /** Puts the celebration away, which only a person does. */
  onCelebrated: () => void;
  /** Moves setup on to the named step, for as long as this session lasts. */
  walkTo: (step: SetupStep) => void;
  /** Records that setup is over, whether it finished or the person left it. */
  settle: () => void;
};

type ServedArrival = {
  /** Whether a request landed on the watched gateway since the wait opened. */
  arrived: boolean;
  /** Drops the watch, which the caller does once it has acted on the arrival. */
  clear: () => void;
  /** Watches a named gateway from this moment on. */
  waitOn: (slug: string) => void;
};

/** A gateway under watch, and the moment it had last answered when the watch opened. */
type Watch = { slug: string; since: number | undefined };

/**
 * @summary A watch already open is kept rather than reopened, or the moment it compares against
 * would move forward with every render and no request would ever read as newer than it.
 */
function watchFor(held: Watch | undefined, standing: string | undefined, traffic: GatewayTraffic) {
  if (standing === undefined) {
    return undefined;
  }

  return held ?? { slug: standing, since: lastServedAt(traffic, standing) };
}

/** The stored gateway a wait stands over, which is the one serving a model. */
function servingGateway(gateways: readonly GatewayConfig[]): string | undefined {
  return gateways.find((gateway) => gateway.virtualModels.length > 0)?.slug;
}

/** What a profile already holds, which is the whole of what the opening step reads. */
function whatStands(gateways: readonly GatewayConfig[]) {
  return {
    gatewayExists: gateways.length > 0,
    virtualModelComposed: gateways.some((gateway) => gateway.virtualModels.length > 0),
  };
}

/**
 * The wait's own watch on the gateway it stands over.
 *
 * @summary It reads the traffic push rather than the profile's first-served flag, because that
 * flag latches once for the life of a profile and setup can be reopened from the menu. Comparing
 * against the moment the wait opened on is what makes a gateway that already answered answer
 * again, rather than settling a wizard on somebody else's old request.
 *
 * A wait a person walked to watches the gateway their run stored. One the wizard opened on watches
 * whichever stored gateway serves a model, because that is the gateway the step is standing over.
 */
function useServedArrival(
  step: SetupStep | null,
  gateways: readonly GatewayConfig[],
  traffic: GatewayTraffic,
): ServedArrival {
  const watched = useRef<Watch | undefined>(undefined);
  const standing = step === 'waiting' ? servingGateway(gateways) : undefined;
  const watching = watchFor(watched.current, standing, traffic);

  watched.current = watching ?? watched.current;

  return {
    arrived:
      watching !== undefined && servedSince(watching.since, lastServedAt(traffic, watching.slug)),
    clear: () => {
      watched.current = undefined;
    },
    waitOn: (slug) => {
      watched.current = { slug, since: lastServedAt(traffic, slug) };
    },
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
 * served, which the watch beside this reads off the traffic push.
 */
export function useSetupStanding(): SetupStanding {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: traffic } = useQuery(engineTrafficQueryOptions);
  const { save } = useSettingsWriter();
  const gatewaysNow = useRef(gateways);

  gatewaysNow.current = gateways;

  const [step, setStep] = useState<SetupStep | null>(() =>
    setupOpensOn({ settled: settings.setupWizardSettled, ...whatStands(gateways) }),
  );
  const [served, setServed] = useState(false);
  const arrival = useServedArrival(step, gateways, traffic ?? {});

  useEffect(
    () =>
      subscribeToSetupReopened(() => {
        setServed(false);
        setStep(setupOpensOn({ settled: false, ...whatStands(gatewaysNow.current) }));
        save({ setupWizardSettled: false });
      }),
    [save],
  );

  if (arrival.arrived) {
    arrival.clear();
    setStep(null);
    setServed(true);
    save({ setupWizardSettled: true });
  }

  return {
    step: settings.setupWizardSettled ? null : step,
    served,
    waitOn: arrival.waitOn,
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
