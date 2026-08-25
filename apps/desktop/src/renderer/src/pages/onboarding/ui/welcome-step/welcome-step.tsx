import { Button, RecomposeMark, RecomposeWordmark } from '../../../../shared/ui';
import { SetupCables } from '../setup-cables/setup-cables';
import { SetupTagline } from '../setup-tagline/setup-tagline';

const LEDE =
  'recompose wires subscriptions, keys and local runtimes into virtual models, so the work keeps moving when a provider stops.';

type WelcomeStepProps = {
  /** Carries the person into the first question setup asks. */
  onSetUp: () => void;
  /** Leaves setup for the canvas, which is the same standing as dismissing it anywhere else. */
  onExplore: () => void;
};

/**
 * The first thing a new profile meets.
 *
 * @summary It asks nothing, so it carries no step dots and no way to skip: the second act is
 * already the way out, and a skip beside it would offer the same exit twice.
 */
export function WelcomeStep({ onSetUp, onExplore }: WelcomeStepProps) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 px-10">
      <SetupCables />
      <div className="relative flex items-center gap-2.5">
        <RecomposeMark className="size-8 shrink-0" />
        <RecomposeWordmark letters={22} />
      </div>
      <SetupTagline />
      <p className="max-w-140 text-center text-body text-ink-secondary">{LEDE}</p>
      <div className="flex items-center gap-2.5">
        <Button onPress={onSetUp} variant="primary">
          Set up my gateway
        </Button>
        <Button onPress={onExplore}>I&apos;ll explore on my own</Button>
      </div>
    </div>
  );
}
