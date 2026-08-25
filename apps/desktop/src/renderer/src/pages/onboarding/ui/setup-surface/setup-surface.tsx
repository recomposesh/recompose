import type { GatewayConfig } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useState } from 'react';

import type { CatalogEntry, ProviderKind } from '../../../../entities/provider';

import { clientNamed } from '../../../../entities/harness';
import { togglePicked } from '../../model/picked-count';
import { useMarkingSources } from '../../model/use-marking-sources';
import { useSetupStanding } from '../../model/use-setup-standing';
import { ServedNote } from '../served-note/served-note';
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
  /**
   * Lands the shell on the gateway setup just stored.
   *
   * @summary Setup cannot navigate: routes are the shell's, and the surface is drawn from the
   * root rather than from a route of its own. The landing happens the moment the gateway reaches
   * disk rather than when the surface goes away, so the canvas behind the last two steps is
   * already the one a person built.
   */
  onBuilt: (gateway: GatewayConfig) => void;
};

/**
 * @summary The note names one harness rather than listing them, because only one of them sent the
 * request and setup cannot tell which. The first picked is the honest guess, and naming none is
 * honest too.
 */
function firstHarnessName(harnesses: ReadonlySet<string>): string | undefined {
  const [first] = [...harnesses];

  return first === undefined ? undefined : clientNamed(first).name;
}

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
export function SetupSurface({ connectSheet, onBuilt }: SetupSurfaceProps) {
  const setup = useSetupStanding();
  const [pickedHarnesses, onPickHarness] = usePicking();
  const { isMarked, onMarkSource } = useMarkingSources();
  const [connecting, setConnecting] = useState<ConnectAsk | undefined>(undefined);
  const [built, setBuilt] = useState<GatewayConfig | undefined>(undefined);

  if (setup.step === null) {
    const { onCelebrated } = setup;

    return setup.served ? (
      <ServedNote harness={firstHarnessName(pickedHarnesses)} onDismiss={onCelebrated} />
    ) : null;
  }

  return (
    <>
      <SetupWizard open step={setup.step}>
        <SetupStanding
          built={built}
          isMarked={isMarked}
          onConnect={(entry, kind) => {
            setConnecting({ entry, kind });
          }}
          onCreate={() => {
            setup.walkTo('building');
          }}
          onBuilt={(gateway) => {
            setBuilt(gateway);
            setup.waitOn(gateway.slug);
            onBuilt(gateway);
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
