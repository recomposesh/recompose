import { connectGroups } from '../../../../entities/harness';
import { Button } from '../../../../shared/ui';
import { continueReads } from '../../model/picked-count';
import { HarnessTile } from '../harness-tile/harness-tile';
import { SetupStepFrame } from '../setup-step-frame/setup-step-frame';

const LEDE = 'Pick every harness you work with. They share one gateway and use it the same way.';

type HarnessStepProps = {
  /** The harnesses the person has picked so far, by catalog id. */
  picked: ReadonlySet<string>;
  /** Picks a harness or takes it back out. */
  onToggle: (id: string) => void;
  /** Steps back to the welcome. */
  onBack: () => void;
  /** Carries the picked harnesses into the next question. */
  onContinue: () => void;
  /** Leaves setup. */
  onSkip: () => void;
};

/**
 * The first question setup asks.
 *
 * @summary It offers the whole connect catalog under the catalog's own headings, so a person
 * meets the same names here that the gateway's connect rail will show them later. Nothing here
 * detects a harness: a machine can tell which editors are installed, and installed is a poor
 * answer to which ones a person actually works in.
 */
export function HarnessStep({ picked, onToggle, onBack, onContinue, onSkip }: HarnessStepProps) {
  return (
    <SetupStepFrame
      acts={
        <>
          <Button onPress={onBack}>Back</Button>
          <Button disabled={picked.size === 0} onPress={onContinue} variant="ink">
            {continueReads(picked.size, 'harness')}
          </Button>
        </>
      }
      lede={LEDE}
      onSkip={onSkip}
      step="harnesses"
    >
      <div className="flex flex-col gap-4">
        {connectGroups.map((group) => (
          <section aria-labelledby={`harness-group-${group.kind}`} key={group.kind}>
            <h2
              className="mb-1.75 text-footnote font-medium tracking-wide text-ink-secondary uppercase"
              id={`harness-group-${group.kind}`}
            >
              {group.title}
            </h2>
            <ul className="grid grid-cols-8 gap-1.5">
              {group.clients.map((client) => (
                <li key={client.id}>
                  <HarnessTile
                    client={client}
                    onToggle={() => {
                      onToggle(client.id);
                    }}
                    picked={picked.has(client.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </SetupStepFrame>
  );
}
