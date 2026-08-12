import type { UsageRetentionDays } from '@recompose/contracts';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  settingsQueryOptions,
  systemQueryOptions,
  useOpenConfigFolder,
  useSettingsWriter,
} from '../../../../shared/api';
import { FieldGroup, FieldRow, SegmentedControl } from '../../../../shared/ui';
import { revealLabelFor } from '../../lib/row-state';
import { RetentionConfirmation } from '../retention-confirmation/retention-confirmation';
import { RowAction } from '../row-action/row-action';

const RETENTION_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const;

function retentionDaysOf(value: string): UsageRetentionDays {
  if (value === '7') {
    return 7;
  }

  return value === '90' ? 90 : 30;
}

type RetentionMoves = {
  standing: UsageRetentionDays;
  hold: (days: UsageRetentionDays) => void;
  save: (days: UsageRetentionDays) => void;
};

function retentionControl({ standing, hold, save }: RetentionMoves) {
  return (
    <SegmentedControl
      label="Usage retention"
      onChangeValue={(next) => {
        const days = retentionDaysOf(next);

        if (days < standing) {
          hold(days);

          return;
        }

        save(days);
      }}
      options={RETENTION_OPTIONS}
      value={String(standing)}
    />
  );
}

/** Where recompose keeps its data, and how long the usage ledger keeps its history. */
export function DataSection() {
  const { data: system } = useSuspenseQuery(systemQueryOptions);
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const openConfigFolder = useOpenConfigFolder();
  const { save } = useSettingsWriter();
  const [heldShortening, setHeldShortening] = useState<UsageRetentionDays | undefined>();

  return (
    <FieldGroup heading="Data">
      <FieldRow
        control={
          <RowAction
            onClick={() => {
              openConfigFolder.mutate();
            }}
          >
            {revealLabelFor(system.fileBrowser)}
          </RowAction>
        }
        description={system.configFolder}
        label="Config folder"
        status={openConfigFolder.isError ? openConfigFolder.error.message : undefined}
      />
      <FieldRow
        control={retentionControl({
          standing: settings.usageRetentionDays,
          hold: setHeldShortening,
          save: (days) => {
            save({ usageRetentionDays: days });
          },
        })}
        description="How long the usage ledger keeps served history. Shortening drops older history for good."
        label="Usage retention"
      />
      <RetentionConfirmation
        days={heldShortening}
        onCancel={() => {
          setHeldShortening(undefined);
        }}
        onConfirm={(days) => {
          setHeldShortening(undefined);
          save({ usageRetentionDays: days });
        }}
      />
    </FieldGroup>
  );
}
