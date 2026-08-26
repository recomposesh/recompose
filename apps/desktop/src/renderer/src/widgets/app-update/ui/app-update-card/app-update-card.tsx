import type { UpdateCheck } from '@recompose/contracts';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { systemQueryOptions, updatesQueryOptions } from '../../../../shared/api';
import { ReadyToRestart } from '../ready-to-restart/ready-to-restart';
import { UpdateCheckNotice } from '../update-check-notice/update-check-notice';

/**
 * The whole update surface the sidebar stands, which is one card at a time.
 *
 * @summary A downloaded version outranks any report about the check that found it, so the two
 * never stack. Dismissing is held here rather than in main because it belongs to the person
 * reading this window, and the standing it clears against makes a fresh check show again.
 */
export function AppUpdateCard() {
  const updates = useSuspenseQuery(updatesQueryOptions);
  const system = useSuspenseQuery(systemQueryOptions);
  const [dismissed, setDismissed] = useState<UpdateCheck['standing'] | null>(null);

  if (updates.data.standing === 'ready') {
    return <ReadyToRestart from={system.data.version} to={updates.data.version} />;
  }

  const check = updates.data.check;

  if (check === undefined || check.standing === dismissed) {
    return null;
  }

  return (
    <UpdateCheckNotice
      check={check}
      onDismiss={() => {
        setDismissed(check.standing);
      }}
      version={system.data.version}
    />
  );
}
