import type { ConnectClient, ConnectFacts } from '../../../../entities/harness';

import { Button } from '../../../../shared/ui';
import { HarnessGuide } from '../harness-guide/harness-guide';
import { SetupStepFrame } from '../setup-step-frame/setup-step-frame';

const LEDE = 'One-time setup for each harness. After this they ask the gateway on their own.';

type PointingStepProps = {
  /** The harnesses the person picked, in the catalog's order. */
  clients: readonly ConnectClient[];
  /** What the gateway offers, which every line is written from. */
  facts: ConnectFacts;
  /** Which entry stands open. */
  openId: string;
  /** Opens one entry, closing whichever stood open before. */
  onOpen: (id: string) => void;
  /** Steps back to the run that built the gateway. */
  onBack: () => void;
  /** Carries the person on to the wait for their first request. */
  onConnected: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

/**
 * The step that points every picked harness at the gateway.
 *
 * @summary The first entry stands open and the rest closed, because a person works through one
 * tool at a time and four open blocks of commands read as one wall. Moving on rests on the person
 * saying they ran the line: setup cannot see inside a terminal, and pretending to would be worse
 * than asking.
 */
export function PointingStep({
  clients,
  facts,
  openId,
  onOpen,
  onBack,
  onConnected,
  onSkip,
}: PointingStepProps) {
  return (
    <SetupStepFrame
      acts={
        <>
          <Button onPress={onBack}>Back</Button>
          <Button onPress={onConnected} variant="ink">
            I connected one
          </Button>
        </>
      }
      lede={LEDE}
      onSkip={onSkip}
      step="pointing"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-line-subtle bg-surface-card">
        {clients.map((client) => (
          <HarnessGuide
            client={client}
            facts={facts}
            key={client.id}
            onOpen={() => {
              onOpen(client.id);
            }}
            open={client.id === openId}
          />
        ))}
      </div>
    </SetupStepFrame>
  );
}
