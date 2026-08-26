import type { GatewayConfig } from '@recompose/contracts';

import { GATEWAY_CONFIG_VERSION, slugFromName } from '@recompose/contracts';
import { useEffect, useRef, useState } from 'react';

import type { FirstTarget } from './first-graph';
import type { RunStanding } from './setup-job';

import {
  fetchOfferedPort,
  fetchStoredGateways,
  IpcResultError,
  refusalSentence,
  useSaveGateway,
} from '../../../shared/api';
import { freeGatewayName } from './first-gateway-name';
import { firstGraph } from './first-graph';

/** What the run has to build, once the person has pressed Create. */
export type BuildOrder = {
  /** The name the gateway wants, which the run counts past where another already holds it. */
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

function gatewayFrom(order: BuildOrder, name: string, port: number): GatewayConfig {
  return {
    schemaVersion: GATEWAY_CONFIG_VERSION,
    slug: slugFromName(name),
    displayName: name,
    port,
    virtualModels: [
      { id: order.modelId, displayName: 'My model', routing: firstGraph(order.targets) },
    ],
    layout: { nodes: {} },
  };
}

/** What the run needs of the save, which is one write it can wait on. */
type GatewayStore = { mutateAsync: (gateway: GatewayConfig) => Promise<unknown> };

const NAME_ATTEMPTS = 5;

const NO_FREE_NAME = 'recompose could not find a free name for this gateway. Try again.';

function nameAlreadyHeld(failure: unknown): failure is IpcResultError {
  return failure instanceof IpcResultError && failure.code === 'name-conflict';
}

/**
 * Writes the gateway under the first name the directory will accept.
 *
 * @summary Reading the directory cannot settle a name, because only the write refuses, and
 * between the read and the write another window, a retry, or a second pass of this effect can
 * take the name the read called free. So the refusal is the signal: a name already held is read
 * again against what the directory now holds and written once more, rather than reported to a
 * person who asked for nothing unusual. Every other refusal travels on untouched.
 */
async function storeUnderAFreeName(order: BuildOrder, store: GatewayStore): Promise<GatewayConfig> {
  let held: Error = new Error(NO_FREE_NAME);

  for (let tries = 0; tries < NAME_ATTEMPTS; tries += 1) {
    const [stored, port] = await Promise.all([fetchStoredGateways(), fetchOfferedPort()]);
    const taken = new Set(stored.map((gateway) => gateway.displayName));
    const gateway = gatewayFrom(order, freeGatewayName(taken, order.gatewayName), port);

    try {
      await store.mutateAsync(gateway);

      return gateway;
    } catch (failure) {
      if (!nameAlreadyHeld(failure)) {
        throw failure;
      }

      held = failure;
    }
  }

  throw held;
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
 * repeats one job instead of rebuilding what already stands. It carries the sentence the refusal
 * arrived with, because a port already held and a directory that cannot be read want different
 * answers from a person, and one line covering both would tell them neither.
 *
 * The write in flight is held rather than started again, so a second pass of this effect joins
 * the write the first one opened. Starting a second would store a gateway nobody asked for and
 * leave the name it took behind.
 */
export function useBuildRun(order: BuildOrder, opensAt: number, running: boolean): BuildRun {
  const [run, setRun] = useState<RunStanding>({ at: opensAt, refusal: undefined });
  const [built, setBuilt] = useState<GatewayConfig | undefined>(undefined);
  const settled = built !== undefined;
  const [attempt, setAttempt] = useState(0);
  const save = useSaveGateway();
  const asked = useRef({ order, opensAt, save });
  const writing = useRef<Promise<GatewayConfig> | undefined>(undefined);

  asked.current = { order, opensAt, save };

  useEffect(() => {
    if (!running || settled) {
      return undefined;
    }

    let left = false;
    const { order: building, opensAt: done, save: store } = asked.current;
    const written = writing.current ?? storeUnderAFreeName(building, store);

    writing.current = written;
    setRun({ at: done, refusal: undefined });

    void written.then(
      (gateway) => {
        if (!left) {
          setBuilt(gateway);
          setRun({ at: done + 2, refusal: undefined });
        }
      },
      (failure: unknown) => {
        writing.current = undefined;

        if (!left) {
          setRun({ at: done, refusal: refusalSentence(failure) });
        }
      },
    );

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
