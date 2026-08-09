import type { ReactNode } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useId, useSyncExternalStore } from 'react';

import {
  accountsQueryOptions,
  gatewaysQueryOptions,
  settingsQueryOptions,
  useSettingsWriter,
} from '../../../../shared/api';
import { getStartedCollapsed, subscribeToGetStartedCollapse } from '../../lib/get-started-collapse';
import { getStartedSteps } from '../../lib/get-started-steps';
import { ChecklistHeader } from '../checklist-header/checklist-header';
import { ChecklistSteps } from '../checklist-steps/checklist-steps';

function progressLine(done: number, total: number): ReactNode {
  return (
    <p className="mt-1 flex items-center gap-2 px-0.5">
      <span className="font-mono text-mono-value text-ink-secondary">
        {`${String(done)} of ${String(total)}`}
      </span>
      <span aria-hidden className="h-1 flex-1 rounded-full bg-surface-track">
        <span
          className="block h-full rounded-full bg-running"
          style={{ inlineSize: `${String((done / total) * 100)}%` }}
        />
      </span>
    </p>
  );
}

/**
 * The four steps of a first session, folded into the foot of the sidebar.
 *
 * @summary Reach for it from the shell, where it stands under the navigation on every surface
 * rather than floating over one. Every step reads its record from stored documents, and the
 * whole card answers the stored checklist choice, so skipping it here and bringing it back from
 * the application menu move the same switch. Folded, it keeps the header and the progress line,
 * which is enough to say how far a session has come.
 */
export function GetStartedPanel() {
  const headingId = useId();
  const { data: gateways } = useSuspenseQuery(gatewaysQueryOptions);
  const { data: registry } = useSuspenseQuery(accountsQueryOptions);
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { save } = useSettingsWriter();
  const collapsed = useSyncExternalStore(subscribeToGetStartedCollapse, getStartedCollapsed);

  if (!settings.showOnboardingChecklist) {
    return null;
  }

  const steps = getStartedSteps({
    gatewayExists: gateways.length > 0,
    providerConnected: registry.accounts.length > 0,
    virtualModelComposed: gateways.some((gateway) => gateway.virtualModels.length > 0),
    firstRequestServed: settings.firstRequestServed,
  });
  const done = steps.filter((step) => step.state === 'done').length;

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-panel border border-line-subtle bg-surface-card px-3 pt-2.5 pb-1.5"
    >
      <ChecklistHeader collapsed={collapsed} headingId={headingId} />
      {progressLine(done, steps.length)}
      <div
        className={`fold-rows ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
        inert={collapsed || undefined}
        style={{ visibility: collapsed ? 'hidden' : 'visible' }}
      >
        <div className="min-h-0 overflow-hidden">
          <ChecklistSteps
            steps={steps}
            onSkip={() => {
              save({ showOnboardingChecklist: false });
            }}
          />
        </div>
      </div>
    </section>
  );
}
