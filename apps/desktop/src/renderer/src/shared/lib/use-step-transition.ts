import { useLayoutEffect, useRef, useState } from 'react';

const STEP_MOTION_MS = 200;

/** Holds the directional entrance class long enough for an ordered step transition to finish. */
export function useStepTransition<Step extends string>(step: Step, order: readonly Step[]): string {
  const previous = useRef(step);
  const orderRef = useRef(order);
  const [motion, setMotion] = useState('');

  orderRef.current = order;

  useLayoutEffect(() => {
    const from = previous.current;

    if (from === step) {
      return undefined;
    }

    previous.current = step;
    const ordered = orderRef.current;
    const next =
      ordered.indexOf(step) > ordered.indexOf(from) ? 'step-enter-forward' : 'step-enter-back';

    setMotion(next);

    const settled = setTimeout(() => {
      setMotion('');
    }, STEP_MOTION_MS);

    return () => {
      clearTimeout(settled);
    };
  }, [step]);

  return motion;
}
