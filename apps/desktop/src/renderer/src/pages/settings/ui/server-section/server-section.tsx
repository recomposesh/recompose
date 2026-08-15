import type { ReactNode } from 'react';

import { DEFAULT_GATEWAY_BIND_ADDRESS } from '@recompose/contracts';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  engineStatesQueryOptions,
  settingsQueryOptions,
  useSettingsWriter,
} from '../../../../shared/api';
import { FieldGroup, FieldRow, Switch } from '../../../../shared/ui';
import { saveStatusFor } from '../../lib/save-failure';
import { RestartConfirmation } from '../restart-confirmation/restart-confirmation';

type SaveSettings = ReturnType<typeof useSettingsWriter>['save'];

type BindAddressDraft = {
  draft: string;
  awaitingRestart: string | undefined;
  onChangeDraft: (typed: string) => void;
  resetDraft: () => void;
  settleDraft: () => void;
  cancelRestart: () => void;
  confirmRestart: (address: string) => void;
};

function useDraftFollowingStored(bindAddress: string) {
  const [storedAddress, setStoredAddress] = useState(bindAddress);
  const [draft, setDraft] = useState(bindAddress);

  if (storedAddress !== bindAddress) {
    setStoredAddress(bindAddress);
    setDraft(bindAddress);
  }

  return { draft, setDraft };
}

function useBindAddressDraft(
  bindAddress: string,
  running: number,
  save: SaveSettings,
): BindAddressDraft {
  const { draft, setDraft } = useDraftFollowingStored(bindAddress);
  const [awaitingRestart, setAwaitingRestart] = useState<string | undefined>(undefined);

  const settleDraft = () => {
    if (awaitingRestart !== undefined) {
      return;
    }

    const next = draft.trim();

    if (next === '') {
      setDraft(bindAddress);

      return;
    }

    setDraft(next);

    if (next === bindAddress) {
      return;
    }

    if (running > 0) {
      setAwaitingRestart(next);

      return;
    }

    save({ bindAddress: next });
  };

  return {
    draft,
    awaitingRestart,
    onChangeDraft: setDraft,
    resetDraft: () => {
      setDraft(bindAddress);
    },
    settleDraft,
    cancelRestart: () => {
      setAwaitingRestart(undefined);
      setDraft(bindAddress);
    },
    confirmRestart: (address) => {
      setAwaitingRestart(undefined);
      save({ bindAddress: address });
    },
  };
}

function bindAddressField(address: BindAddressDraft): ReactNode {
  return (
    <input
      aria-label="Bind address"
      autoCapitalize="none"
      autoCorrect="off"
      className="field-control w-52 font-mono"
      onBlur={() => {
        address.settleDraft();
      }}
      onInput={(event) => {
        address.onChangeDraft(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          address.settleDraft();
        }

        if (event.key === 'Escape') {
          address.resetDraft();
        }
      }}
      spellCheck={false}
      type="text"
      value={address.draft}
    />
  );
}

function bindAddressRow(address: BindAddressDraft, unsavedFields: readonly string[]): ReactNode {
  return (
    <FieldRow
      control={bindAddressField(address)}
      description="Defaults to this machine. Use 0.0.0.0 or another host to serve other devices."
      label="Bind address"
      status={saveStatusFor('bindAddress', unsavedFields)}
    />
  );
}

function launchRow(
  startOnLaunch: boolean,
  save: SaveSettings,
  unsavedFields: readonly string[],
): ReactNode {
  return (
    <FieldRow
      control={
        <Switch
          checked={startOnLaunch}
          label="Start gateways on launch"
          onChangeChecked={(enabled) => {
            save({ startGatewaysOnLaunch: enabled });
          }}
        />
      }
      description="Starts every gateway when recompose opens. When off, gateways return as you left them."
      label="Start gateways on launch"
      status={saveStatusFor('startGatewaysOnLaunch', unsavedFields)}
    />
  );
}

/** The address every gateway answers on, and the launch behavior they all share. */
export function ServerSection() {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { data: engineStates } = useSuspenseQuery(engineStatesQueryOptions);
  const { save, unsavedFields } = useSettingsWriter();
  const bindAddress = settings.bindAddress ?? DEFAULT_GATEWAY_BIND_ADDRESS;
  const running = Object.values(engineStates).filter((state) => state.status === 'running').length;
  const address = useBindAddressDraft(bindAddress, running, save);

  return (
    <>
      <FieldGroup heading="Server">
        {bindAddressRow(address, unsavedFields)}
        {launchRow(settings.startGatewaysOnLaunch === true, save, unsavedFields)}
      </FieldGroup>
      <RestartConfirmation
        address={address.awaitingRestart}
        onCancel={() => {
          address.cancelRestart();
        }}
        onConfirm={(acceptedAddress) => {
          address.confirmRestart(acceptedAddress);
        }}
        running={running}
      />
    </>
  );
}
