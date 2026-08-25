import { useState } from 'react';

import { refusalSentence } from '../../../../shared/api';

/** The gateway a right-click asked about, held while the question stands. */
type GatewayAsked = { slug: string; displayName: string };

type DeletionAsk = {
  /** The gateway a person is being asked about, or nothing while none stands. */
  asked: GatewayAsked | undefined;
  /** Why the last attempt was turned down, which the question carries in place of the cost. */
  refusal: string | undefined;
  /** Raises the question over one row. */
  ask: (gateway: GatewayAsked) => void;
  /** Puts the question away with the gateway still there. */
  cancel: () => void;
  /** Answers the question, which is the act that deletes. */
  confirm: () => void;
};

/**
 * The question standing between a right-click and a gateway leaving.
 *
 * @summary A refusal keeps the question open and says why, because closing it over a gateway
 * still on disk tells a person the opposite of what happened. Each new ask clears the last
 * refusal, so a question never opens wearing an answer to something else.
 */
export function useDeletionAsk(
  deleteGateway: (slug: string) => Promise<void>,
  onDeleted: (slug: string) => void,
): DeletionAsk {
  const [asked, setAsked] = useState<GatewayAsked | undefined>(undefined);
  const [refusal, setRefusal] = useState<string | undefined>(undefined);

  return {
    asked,
    refusal,
    ask: (gateway) => {
      setRefusal(undefined);
      setAsked(gateway);
    },
    cancel: () => {
      setAsked(undefined);
    },
    confirm: () => {
      if (asked === undefined) {
        return;
      }

      void deleteGateway(asked.slug).then(
        () => {
          setAsked(undefined);
          onDeleted(asked.slug);
        },
        (failure: unknown) => {
          setRefusal(refusalSentence(failure));
        },
      );
    },
  };
}
