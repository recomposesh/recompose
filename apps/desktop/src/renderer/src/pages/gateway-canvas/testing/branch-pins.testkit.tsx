import type { GatewayBranchPins } from '@recompose/contracts';
import type { Decorator } from '@storybook/react-vite';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { bindEngineBranchPinsToCache } from '../../../shared/api';
import { emitEngineBranchPins } from '../../../shared/testing';

function PinsPushedIn({ pinned }: { pinned: GatewayBranchPins }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const stop = bindEngineBranchPinsToCache(queryClient);

    emitEngineBranchPins(pinned);

    return stop;
  }, [pinned, queryClient]);

  return null;
}

/**
 * Stands a reading under a pin snapshot the engine pushed, rather than one the story wrote.
 *
 * @summary The count reaches the rows only by the push lane, so a reading that seeded the cache by
 * hand would prove the rows can render a number without proving they ever receive one. The binding
 * lives here rather than in each story, because the lane is the same wherever a branch is counted.
 */
export function pushingPins(pinned: GatewayBranchPins): Decorator {
  return function UnderPushedPins(Story) {
    return (
      <>
        <PinsPushedIn pinned={pinned} />
        <Story />
      </>
    );
  };
}
