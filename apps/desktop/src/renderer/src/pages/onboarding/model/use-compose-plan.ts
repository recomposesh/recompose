import { useQuery } from '@tanstack/react-query';

import type { DiagramTarget } from '../ui/setup-diagram/setup-diagram';
import type { FoundSource } from './found-source';

import { offeredPortQueryOptions } from '../../../shared/api';
import { firstModelName, pickServedModel } from './first-model';
import { useFirstGatewayName } from './use-first-gateway-name';
import { useServedModels } from './use-served-models';

const TURN = ['answering this turn', 'answers the next one'];

function kindOf(source: FoundSource): DiagramTarget['kind'] {
  return source.kind === 'local' ? 'local-runtime' : 'subscription';
}

function whoseTurn(source: FoundSource, index: number): string {
  return `${source.title} · ${TURN[index] ?? 'takes its turn after'}`;
}

/**
 * What setup means to build, read off what the person picked and what their accounts serve.
 *
 * @summary Every target's model comes from the account's own listing rather than from a name
 * recompose carries, so a plan a provider retired never reaches the diagram. A source whose
 * listing has not landed yet stands with its own name in place of a model, because a card that
 * blanks out while a request is in flight reads as a fault rather than as a wait.
 */
export function useComposePlan(
  harnesses: ReadonlySet<string>,
  marked: readonly FoundSource[],
): { gatewayName: string; port: string; modelId: string; targets: readonly DiagramTarget[] } {
  const recorded: FoundSource[] = [];

  for (const source of marked) {
    if (!source.adoptable) {
      recorded.push(source);
    }
  }

  const { data: port } = useQuery(offeredPortQueryOptions);
  const gatewayName = useFirstGatewayName();
  const listings = useServedModels(recorded);

  const served = recorded.map((source, index) => {
    const model = pickServedModel(listings[index] ?? []);

    return {
      kind: kindOf(source),
      model: model ?? source.title,
      under: whoseTurn(source, index),
    };
  });

  return {
    gatewayName,
    port: port === undefined ? '' : `:${String(port)}`,
    modelId: firstModelName(harnesses),
    targets: served,
  };
}
