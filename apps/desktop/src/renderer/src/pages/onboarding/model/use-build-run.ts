import type { GatewayConfig } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION, slugFromName } from '@recompose/contracts';
import { useEffect, useRef, useState } from 'react';

import type { FirstTarget } from './first-graph';
import type { RunStanding } from './setup-job';

import { fetchOfferedPort, useSaveGateway } from '../../../shared/api';
import { firstGraph } from './first-graph';

/** What the run has to build, once the person has pressed Create. */
export type BuildOrder = {
  /** The gateway's name, which its slug and its route are read off. */
  gatewayName: string;
  /** The id a harness asks for. */
  modelId: string;
  /** The accounts and models the router deals between. */
  targets: readonly FirstTarget[];
};

type BuildRun = {
  /** How far the run has got, and what stopped it. */
  run: RunStanding;
  /** The gateway the run stored, once it stored one. */
  built: GatewayConfig | undefined;
  /** Runs the refused job again, from where it stopped. */
  onRetry: () => void;
};

const REFUSED_GATEWAY = 'recompose could not open a gateway on this machine.';

function gatewayFrom(order: BuildOrder, port: number): GatewayConfig {
  return {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug: slugFromName(order.gatewayName),
    displayName: order.gatewayName,
    port,
    virtualModels: [
      { id: order.modelId, displayName: 'My model', routing: firstGraph(order.targets) },
    ],
    layout: { nodes: {} },
  };
}

/**
 * The run that opens the gateway and composes the first virtual model.
 *
 * @summary The accounts are already recorded by the time this runs, so the run opens past them and
 * has only the gateway left to do. Both pieces reach disk in one write, because a gateway stored
 * without its virtual model is a graph a person never asked for and would have to finish by hand
 * if the second write refused.
 *
 * A refusal leaves the run standing where it stopped rather than unwinding it, so trying again
 * repeats one job instead of rebuilding what already stands.
 */
export function useBuildRun(order: BuildOrder, recorded: number, running: boolean): BuildRun {
  const [run, setRun] = useState<RunStanding>({ at: recorded, refusal: undefined });
  const [built, setBuilt] = useState<GatewayConfig | undefined>(undefined);
  const settled = built !== undefined;
  const [attempt, setAttempt] = useState(0);
  const save = useSaveGateway();
  const asked = useRef({ order, recorded, save });

  asked.current = { order, recorded, save };

  useEffect(() => {
    if (!running || settled) {
      return undefined;
    }

    let left = false;
    const { order: building, recorded: done, save: store } = asked.current;

    const build = async (): Promise<void> => {
      try {
        const gateway = gatewayFrom(building, await fetchOfferedPort());

        await store.mutateAsync(gateway);

        if (!left) {
          setBuilt(gateway);
          setRun({ at: done + 2, refusal: undefined });
        }
      } catch {
        if (!left) {
          setRun({ at: done, refusal: REFUSED_GATEWAY });
        }
      }
    };

    setRun({ at: done, refusal: undefined });
    void build();

    return () => {
      left = true;
    };
  }, [attempt, running, settled]);

  return {
    run,
    built,
    onRetry: () => {
      setAttempt((stood) => stood + 1);
    },
  };
}
