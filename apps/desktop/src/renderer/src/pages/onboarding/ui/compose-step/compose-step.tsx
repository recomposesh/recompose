import type { DiagramTarget } from '../setup-diagram/setup-diagram';

import { Button } from '../../../../shared/ui';
import { SetupDiagram } from '../setup-diagram/setup-diagram';
import { SetupStepFrame } from '../setup-step-frame/setup-step-frame';

type ComposeStepProps = {
  /** The gateway's name, which setup names before it opens one. */
  gatewayName: string;
  /** The port the gateway will answer on. */
  port: string;
  /** The id a harness will ask for. */
  modelId: string;
  /** The targets the router will deal between. */
  targets: readonly DiagramTarget[];
  /** Steps back to the source question. */
  onBack: () => void;
  /** Builds the graph the diagram just showed. */
  onCreate: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

function ledeFor(modelId: string, targets: number): string {
  const dealing =
    targets > 1
      ? `a router deals each request across your ${String(targets)} sources, turn by turn`
      : 'a router stands ready to deal each request, so a second source drops straight in';

  return `A name you own. Your harnesses ask for ${modelId}; ${dealing}. Rearrange it any time. Your harnesses never notice.`;
}

/**
 * The graph setup means to build, shown before a person is asked to build it.
 *
 * @summary The router stands even behind a single target, because a graph a person can extend by
 * dropping a second source on it beats one they would have to take apart first.
 */
export function ComposeStep({
  gatewayName,
  port,
  modelId,
  targets,
  onBack,
  onCreate,
  onSkip,
}: ComposeStepProps) {
  return (
    <SetupStepFrame
      acts={
        <>
          <Button onPress={onBack}>Back</Button>
          <Button onPress={onCreate} variant="ink">
            Create
          </Button>
        </>
      }
      lede={ledeFor(modelId, targets.length)}
      onSkip={onSkip}
      rail="drawing"
      step="compose"
    >
      <SetupDiagram gatewayName={gatewayName} modelId={modelId} port={port} targets={targets} />
    </SetupStepFrame>
  );
}
