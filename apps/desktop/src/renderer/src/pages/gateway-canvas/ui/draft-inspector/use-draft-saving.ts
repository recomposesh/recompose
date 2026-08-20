import type { GatewayConfig } from '@recompose/contracts';

import { useState } from 'react';

import type { SettledDefinition } from '../../lib/model-draft';

import { useDefineVirtualModel } from '../../../../shared/api';
import { idRefusal, refusalFromMain } from '../../lib/draft-refusals';
import { gatewayDefiningDraft } from '../../lib/model-draft';

/**
 * The one act the draft inspector's foot carries out, and everything the foot reads off it.
 *
 * @summary Only the id is checked here, because the button already withholds itself while any
 * field a save needs stands blank. What is left is the id a person filled in and cannot see the
 * trouble with: one this gateway already serves, or one no client could send. Those wait for the
 * press, so a person meets them having asked for the save rather than while still typing.
 */
export function useDraftSaving(
  gateway: GatewayConfig,
  definition: SettledDefinition,
  onDefined: (definition: SettledDefinition) => void,
) {
  const define = useDefineVirtualModel();
  const [attempted, setAttempted] = useState(false);
  const [refusal, setRefusal] = useState<string | undefined>(undefined);

  return {
    attempted,
    refusal,
    saving: define.isPending,
    clearRefusal: () => {
      setRefusal(undefined);
    },
    save: () => {
      setAttempted(true);

      if (idRefusal(definition.id, gateway.virtualModels) !== undefined) {
        return;
      }

      define.mutate(gatewayDefiningDraft(gateway, definition), {
        onSuccess: () => {
          onDefined(definition);
        },
        onError: (failure) => {
          setRefusal(refusalFromMain(failure));
        },
      });
    },
  };
}
