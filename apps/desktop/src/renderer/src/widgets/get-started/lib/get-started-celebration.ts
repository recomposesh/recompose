import { useEffect, useRef, useState } from 'react';

const CELEBRATION_MS = 1300;

/**
 * Whether the checklist is celebrating, and the moment the celebration should end.
 *
 * @summary The burst fires only on the transition into completeness observed while the panel
 * stands, so a checklist reopened from the menu after everything was already done shows itself
 * quietly instead of vanishing the moment it returns. The celebration runs once per mount: what
 * ends it is the stored choice the caller writes, which takes the whole panel away.
 */
export function useCompletionCelebration(complete: boolean, onCelebrated: () => void): boolean {
  const [bursting, setBursting] = useState(false);
  const stood = useRef(complete);
  const celebrated = useRef(false);
  const ended = useRef(onCelebrated);

  ended.current = onCelebrated;

  useEffect(() => {
    if (stood.current || !complete || celebrated.current) {
      stood.current = complete;

      return undefined;
    }

    celebrated.current = true;
    setBursting(true);

    const away = setTimeout(() => {
      ended.current();
    }, CELEBRATION_MS);

    return () => {
      clearTimeout(away);
    };
  }, [complete]);

  return bursting;
}
