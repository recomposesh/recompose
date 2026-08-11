import { useSuspenseQuery } from '@tanstack/react-query';

import { systemQueryOptions, useOpenConfigFolder } from '../../../../shared/api';
import { FieldGroup, FieldRow } from '../../../../shared/ui';
import { revealLabelFor } from '../../lib/row-state';
import { RowAction } from '../row-action/row-action';

/** Where recompose keeps its data. */
export function DataSection() {
  const { data: system } = useSuspenseQuery(systemQueryOptions);
  const openConfigFolder = useOpenConfigFolder();

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
    </FieldGroup>
  );
}
