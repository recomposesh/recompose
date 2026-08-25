import { Button, CopyButton, StatusIndicator } from '../../../../shared/ui';
import { SetupSonar } from '../setup-sonar/setup-sonar';
import { SetupStepFrame } from '../setup-step-frame/setup-step-frame';

const NAMED = new Intl.ListFormat('en', { type: 'disjunction' });

const RECOVERY = 'Nothing after a minute? Check the line ran in the same terminal session.';

type WaitingStepProps = {
  /** The address a harness sends to. */
  address: string;
  /** The harnesses the person said they would point, named in the lede. */
  harnesses: readonly string[];
  /** Steps back to the commands. */
  onShowCommands: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

function ledeFor(harnesses: readonly string[]): string {
  const named = harnesses.length === 0 ? 'your harness' : NAMED.format(harnesses);

  return `Send any prompt from ${named}. The first request to land here finishes the setup.`;
}

/**
 * The last step, which waits on something a person does somewhere else.
 *
 * @summary It offers one act, and that act is the way back to the commands: nothing on this screen
 * can make a request arrive, so a control promising otherwise would be a lie. The recovery line is
 * the one thing that reliably goes wrong, which is a variable set in a terminal the person then
 * left.
 */
export function WaitingStep({ address, harnesses, onShowCommands, onSkip }: WaitingStepProps) {
  return (
    <SetupStepFrame
      acts={
        <Button onPress={onShowCommands} variant="ink">
          Show the commands again
        </Button>
      }
      lede={ledeFor(harnesses)}
      onSkip={onSkip}
      step="waiting"
    >
      <div className="flex flex-col items-center gap-5">
        <SetupSonar />
        <span className="flex items-center gap-2 rounded-pill border border-line-subtle bg-surface-card px-3 py-1.5">
          <StatusIndicator status="running" />
          <code className="font-mono text-mono-value text-ink">{address}</code>
          <CopyButton
            announcement="Address copied."
            label="Copy the gateway address"
            value={address}
          />
        </span>
        <p aria-live="polite" className="text-detail text-ink-secondary">
          {RECOVERY}
        </p>
      </div>
    </SetupStepFrame>
  );
}
