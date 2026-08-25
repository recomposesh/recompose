import type { ReactNode } from 'react';

import { useState } from 'react';

import type { CatalogEntry, ProviderKind } from '../../../../entities/provider';

import { togglePicked } from '../../model/picked-count';
import { useSetupStanding } from '../../model/use-setup-standing';
import { SetupStanding } from '../setup-standing/setup-standing';
import { SetupWizard } from '../setup-wizard/setup-wizard';

/** What setup asks the shell to open for it, because the connect sheet is the providers page's. */
export type ConnectAsk = { entry: CatalogEntry; kind: ProviderKind };

type SetupSurfaceProps = {
  /**
   * Draws the connect sheet for the provider setup asked about, and nothing while it asks about
   * none.
   *
   * @summary Setup cannot reach the providers page's own sheet, and a second copy of it would be
   * a second place for a connect to drift. The shell holds both, so it hands one to the other.
   */
  connectSheet: (ask: ConnectAsk | undefined, onSettled: () => void) => ReactNode;
};

function usePicking(): [ReadonlySet<string>, (id: string) => void] {
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());

  return [
    picked,
    (id) => {
      setPicked((standing) => togglePicked(standing, id));
    },
  ];
}

/**
 * Setup, standing over whatever route the shell is painting.
 *
 * @summary It renders in place rather than taking a route of its own, so the surface underneath
 * survives and setup resolving lands a person back on it. A route would need a guard that reads
 * the same standing the route it redirects to reads, which is the shape every redirect loop in
 * the router's own tracker takes.
 */
export function SetupSurface({ connectSheet }: SetupSurfaceProps) {
  const setup = useSetupStanding();
  const [pickedHarnesses, onPickHarness] = usePicking();
  const [markedSources, onMarkSource] = usePicking();
  const [connecting, setConnecting] = useState<ConnectAsk | undefined>(undefined);

  if (setup.step === null) {
    return null;
  }

  return (
    <>
      <SetupWizard open step={setup.step}>
        <SetupStanding
          markedSources={markedSources}
          onConnect={(entry, kind) => {
            setConnecting({ entry, kind });
          }}
          onMarkSource={onMarkSource}
          onPickHarness={onPickHarness}
          pickedHarnesses={pickedHarnesses}
          settle={setup.settle}
          step={setup.step}
          walkTo={setup.walkTo}
        />
      </SetupWizard>
      {connectSheet(connecting, () => {
        setConnecting(undefined);
      })}
    </>
  );
}
