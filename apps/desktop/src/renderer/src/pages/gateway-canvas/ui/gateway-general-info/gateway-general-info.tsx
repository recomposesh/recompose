import type { GatewayConfig } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useState } from 'react';

import { useDefineVirtualModel } from '../../../../shared/api';
import { UsageSummaryLink } from '../../../../shared/ui';
import {
  editFooter,
  editRow,
  editableSectionHeading,
  factRow,
} from '../subject-shell/subject-shell';

function gatewayNameRow(name: string, onName: (name: string) => void): ReactNode {
  return editRow(
    'Name',
    <input
      aria-label="Gateway name"
      className="field-control w-full"
      onInput={(event) => {
        onName(event.currentTarget.value);
      }}
      type="text"
      value={name}
    />,
  );
}

type GatewayGeneralInfoProps = {
  /** The stored gateway whose name the box reads and rewrites. */
  gateway: GatewayConfig;
};

/**
 * The gateway's own facts, with the name a person can rewrite in place.
 *
 * @summary The name is display only, so saving it neither restarts anything nor warns about
 * clients: they call the port, not the title.
 */
export function GatewayGeneralInfo({ gateway }: GatewayGeneralInfoProps) {
  const rewrite = useDefineVirtualModel();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(gateway.displayName);
  const [refused, setRefused] = useState<string | undefined>(undefined);

  const save = () => {
    const next = name.trim();

    if (next === '') {
      setRefused('A gateway needs a name to stand under.');

      return;
    }

    rewrite.mutate(
      { ...gateway, displayName: next },
      {
        onSuccess: () => {
          setEditing(false);
        },
        onError: (failure) => {
          setRefused(failure.message);
        },
      },
    );
  };

  const beginEditing = () => {
    setName(gateway.displayName);
    setRefused(undefined);
    setEditing(true);
  };

  const leaveEditing = () => {
    setEditing(false);
    setRefused(undefined);
  };

  return (
    <>
      {editableSectionHeading('General Info', editing, beginEditing)}
      <div className="field-box">
        {editing ? gatewayNameRow(name, setName) : factRow('Name', gateway.displayName)}
      </div>
      {editing ? editFooter({ onCancel: leaveEditing, onSave: save }, refused) : null}
      <div className="mt-2 px-1">
        <UsageSummaryLink scope={{ param: 'gateway', value: gateway.slug }} />
      </div>
    </>
  );
}
