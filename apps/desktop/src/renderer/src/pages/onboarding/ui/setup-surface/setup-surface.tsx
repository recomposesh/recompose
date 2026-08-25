import { useState } from 'react';

import { togglePicked } from '../../model/picked-count';
import { useSetupStanding } from '../../model/use-setup-standing';
import { HarnessStep } from '../harness-step/harness-step';
import { SetupWizard } from '../setup-wizard/setup-wizard';
import { WelcomeStep } from '../welcome-step/welcome-step';

/**
 * Setup, standing over whatever route the shell is painting.
 *
 * @summary It renders in place rather than taking a route of its own, so the surface underneath
 * survives and setup resolving lands a person back on it. A route would need a guard that reads
 * the same standing the route it redirects to reads, which is the shape every redirect loop in
 * the router's own tracker takes.
 */
export function SetupSurface() {
  const setup = useSetupStanding();
  const [harnesses, setHarnesses] = useState<ReadonlySet<string>>(new Set());

  if (setup.step === null) {
    return null;
  }

  return (
    <SetupWizard open step={setup.step}>
      {setup.step === 'welcome' ? (
        <WelcomeStep
          onExplore={() => {
            setup.settle();
          }}
          onSetUp={() => {
            setup.walkTo('harnesses');
          }}
        />
      ) : null}
      {setup.step === 'harnesses' ? (
        <HarnessStep
          onBack={() => {
            setup.walkTo('welcome');
          }}
          onContinue={() => {
            setup.walkTo('sources');
          }}
          onSkip={() => {
            setup.settle();
          }}
          onToggle={(id) => {
            setHarnesses(togglePicked(harnesses, id));
          }}
          picked={harnesses}
        />
      ) : null}
    </SetupWizard>
  );
}
