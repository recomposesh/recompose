import type { ReactElement } from 'react';

import { useState } from 'react';

import type { CatalogEntry, ConnectionWay, ProviderKind } from '../../../../entities/provider';

import { Sheet } from '../../../../shared/ui';
import { CatalogList } from '../catalog-list/catalog-list';
import { ProviderConnectWay } from '../provider-connect-way/provider-connect-way';

export type CatalogFlowProps = {
  /** The kind the screen behind holds, which is the only kind the catalog offers. */
  kind: ProviderKind;
  /** Whether the catalog stands over the screen. */
  open: boolean;
  /** Receives the state the person asked for, including a dismissal and a finished connect. */
  onOpenChange: (open: boolean) => void;
  /**
   * The provider the sheet opens straight onto, where the caller already picked one.
   *
   * @summary A caller with its own grid has already asked the question the catalog step asks, so
   * the sheet opens on the connect and offers no way back to a grid that was never behind it.
   */
  openedOn?: CatalogEntry | undefined;
};

type ConnectStep = { entry: CatalogEntry; way: ConnectionWay };

function connectStepFor(
  picked: CatalogEntry | undefined,
  kind: ProviderKind,
): ConnectStep | undefined {
  return picked === undefined ? undefined : { entry: picked, way: kind };
}

const descriptions: Record<ProviderKind, string> = {
  subscription: 'Connect the plan this machine already signs into, or sign in with another.',
  'api-key': "Paste a key for one provider's endpoint.",
  aggregator: 'One key, many models, routed through a hosted catalog.',
  local: 'Servers this machine already runs.',
};

/**
 * The two steps of the catalog: the grid of one kind, then the picked provider's connect.
 *
 * @summary The flow forgets its pick at the moment it reopens rather than while it closes, so the
 * next open always starts on the grid and a closing sheet never flashes a reset step mid-fade.
 */
function useFreshGridOnReopen(open: boolean, forgetThePick: () => void): void {
  const [stoodOpen, setStoodOpen] = useState(open);

  if (open !== stoodOpen) {
    setStoodOpen(open);

    if (open) {
      forgetThePick();
    }
  }
}

/**
 * @summary A sheet a caller opened on one provider has no grid behind it, so it offers no way back
 * to one. Only the sheet that opened on its own grid does.
 */
function wayBack(
  picked: CatalogEntry | undefined,
  openedOn: CatalogEntry | undefined,
  back: () => void,
): (() => void) | undefined {
  return picked === undefined || openedOn !== undefined ? undefined : back;
}

function cancelAct(onCancel: () => void): ReactElement {
  return (
    <button className="push-button" onClick={onCancel} type="button">
      Cancel
    </button>
  );
}

export function CatalogFlow({ kind, open, onOpenChange, openedOn }: CatalogFlowProps) {
  const [picked, setPicked] = useState<CatalogEntry | undefined>(openedOn);
  const [arrived, setArrived] = useState<'opening' | 'back'>('opening');

  useFreshGridOnReopen(open, () => {
    setPicked(openedOn);
    setArrived('opening');
  });

  const back = () => {
    setPicked(undefined);
    setArrived('back');
  };

  const connecting = connectStepFor(picked, kind);
  const stepBack = wayBack(picked, openedOn, back);

  return (
    <Sheet
      description={descriptions[kind]}
      footer={cancelAct(() => {
        onOpenChange(false);
      })}
      onBack={stepBack}
      onOpenChange={onOpenChange}
      open={open}
      title="Add provider"
      width={connecting === undefined ? 'wide' : 'standard'}
    >
      {connecting === undefined ? (
        <div className={arrived === 'back' ? 'step-enter-back' : ''}>
          <CatalogList kind={kind} onPick={setPicked} />
        </div>
      ) : (
        <div className="step-enter-forward">
          <ProviderConnectWay
            entry={connecting.entry}
            onConnected={() => {
              onOpenChange(false);
            }}
            way={connecting.way}
          />
        </div>
      )}
    </Sheet>
  );
}
