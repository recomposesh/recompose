import { useSuspenseQuery } from '@tanstack/react-query';

import { useSettingsWriter } from '../../../../shared/api';
import { systemQueryOptions } from '../../../../shared/api';
import { FieldGroup, FieldRow, Switch } from '../../../../shared/ui';
import { launchAtLoginRow } from '../../lib/row-state';
import { saveStatusFor } from '../../lib/save-failure';

/** Launch at login and menu bar presence. */
export function GeneralSection() {
  const { data: system } = useSuspenseQuery(systemQueryOptions);
  const { save, unsavedFields } = useSettingsWriter();

  const { rendered, ...waiting } = launchAtLoginRow(system.loginItem);

  return (
    <FieldGroup heading="General">
      {rendered ? (
        <FieldRow
          control={
            <Switch
              checked={system.loginItemEnabled}
              inert={waiting.inert}
              label="Launch at login"
              onChangeChecked={(enabled) => {
                save({ launchAtLogin: enabled });
              }}
            />
          }
          description="Opens recompose when you sign in."
          label="Launch at login"
          inert={waiting.inert}
          reason={waiting.reason}
          status={saveStatusFor('launchAtLogin', unsavedFields)}
        />
      ) : null}
      <FieldRow
        control={
          <Switch
            checked={system.menuBarVisible}
            label="Show in menu bar"
            onChangeChecked={(visible) => {
              save({ showInMenuBar: visible });
            }}
          />
        }
        description="Keeps recompose running after the last window closes."
        label="Show in menu bar"
        status={saveStatusFor('showInMenuBar', unsavedFields)}
      />
    </FieldGroup>
  );
}
