import type { GatewayBranchPins, GatewayCooldowns } from '@recompose/contracts';
import type { Decorator } from '@storybook/react-vite';
import type { QueryClient } from '@tanstack/react-query';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { bindEngineBranchPinsToCache, bindEngineCooldownsToCache } from '../../../shared/api';
import { emitEngineBranchPins, emitEngineCooldowns } from '../../../shared/testing';

type EnginePush = { bind: (queryClient: QueryClient) => () => void; emit: () => void };

function PushedIn({ push }: { push: EnginePush }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const stop = push.bind(queryClient);

    push.emit();

    return stop;
  }, [push, queryClient]);

  return null;
}

/**
 * Stands a reading under a snapshot the engine pushed, rather than one the story wrote.
 *
 * @summary A reading reaches the screen only by the push lane, so a story that seeded the cache by
 * hand would prove the screen can render an answer without proving it ever receives one. The
 * binding lives here rather than in each story, because the lane is the same wherever it runs.
 */
function underAPush(push: EnginePush): Decorator {
  return function UnderAPush(Story) {
    return (
      <>
        <PushedIn push={push} />
        <Story />
      </>
    );
  };
}

/** Stands the story under the branch counts the engine says each router is holding. */
export function pushingPins(pinned: GatewayBranchPins): Decorator {
  return underAPush({
    bind: bindEngineBranchPinsToCache,
    emit: () => {
      emitEngineBranchPins(pinned);
    },
  });
}

/** Stands the story under the moments the engine says each route node is back up by. */
export function pushingCooldowns(cooling: GatewayCooldowns): Decorator {
  return underAPush({
    bind: bindEngineCooldownsToCache,
    emit: () => {
      emitEngineCooldowns(cooling);
    },
  });
}
