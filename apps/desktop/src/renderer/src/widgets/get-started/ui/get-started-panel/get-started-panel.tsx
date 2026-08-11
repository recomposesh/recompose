import type { GatewayConfig } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

import {
  accountsQueryOptions,
  gatewaysQueryOptions,
  settingsQueryOptions,
  useSettingsWriter,
} from '../../../../shared/api';
import { usePanelReveal } from '../../../../shared/lib';
import { useCompletionCelebration } from '../../lib/get-started-celebration';
import { getStartedCollapsed, subscribeToGetStartedCollapse } from '../../lib/get-started-collapse';
import { getStartedSteps } from '../../lib/get-started-steps';
import { ChecklistHeader } from '../checklist-header/checklist-header';
import { ChecklistSteps } from '../checklist-steps/checklist-steps';

const CHECKLIST_EXIT_MS = 150;

const confetti = [
  { at: 0, tint: 'var(--color-gateway)', drift: '-64px', delay: '0ms' },
  { at: 1, tint: 'var(--color-virtual-model)', drift: '-40px', delay: '60ms' },
  { at: 2, tint: 'var(--color-subscription)', drift: '-18px', delay: '20ms' },
  { at: 3, tint: 'var(--color-running)', drift: '4px', delay: '90ms' },
  { at: 4, tint: 'var(--color-api-key)', drift: '26px', delay: '40ms' },
  { at: 5, tint: 'var(--color-aggregator)', drift: '48px', delay: '110ms' },
  { at: 6, tint: 'var(--color-local)', drift: '68px', delay: '10ms' },
  { at: 7, tint: 'var(--color-gateway)', drift: '-52px', delay: '130ms' },
  { at: 8, tint: 'var(--color-virtual-model)', drift: '14px', delay: '70ms' },
  { at: 9, tint: 'var(--color-subscription)', drift: '-28px', delay: '150ms' },
  { at: 10, tint: 'var(--color-api-key)', drift: '38px', delay: '30ms' },
  { at: 11, tint: 'var(--color-aggregator)', drift: '58px', delay: '170ms' },
];

function confettiBurst(): ReactNode {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {confetti.map((piece) => (
        <i
          className="confetti-piece"
          key={piece.at}
          style={{
            '--confetti-tint': piece.tint,
            '--confetti-drift': piece.drift,
            animationDelay: piece.delay,
          }}
        />
      ))}
    </span>
  );
}

function foldRows(collapsed: boolean, steps: ReactNode): ReactNode {
  return (
    <div
      className={`fold-rows ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
      inert={collapsed || undefined}
      style={{ visibility: collapsed ? 'hidden' : 'visible' }}
    >
      <div className="min-h-0 overflow-hidden">{steps}</div>
    </div>
  );
}

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

function sessionSteps(
  gateways: readonly GatewayConfig[],
  providerConnected: boolean,
  firstRequestServed: boolean,
) {
  return getStartedSteps({
    gatewayExists: gateways.length > 0,
    providerConnected,
    virtualModelComposed: gateways.some((gateway) => gateway.virtualModels.length > 0),
    firstRequestServed,
  });
}

function useCompletionLeaving(
  save: ReturnType<typeof useSettingsWriter>['save'],
  checklistShown: boolean,
) {
  const saveSettings = useRef(save);
  const [completionLeaving, setCompletionLeaving] = useState(false);
  const [checklistShownBefore, setChecklistShownBefore] = useState(checklistShown);

  saveSettings.current = save;

  if (checklistShownBefore !== checklistShown) {
    setChecklistShownBefore(checklistShown);

    if (!checklistShown) {
      setCompletionLeaving(false);
    }
  }

  useEffect(() => {
    if (!completionLeaving) {
      return undefined;
    }

    const persistence = setTimeout(() => {
      saveSettings.current({ showOnboardingChecklist: false });
    }, CHECKLIST_EXIT_MS);

    return () => {
      clearTimeout(persistence);
    };
  }, [completionLeaving]);

  return {
    completionLeaving,
    leaveAfterCelebration: () => {
      setCompletionLeaving(true);
    },
  };
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
  const { completionLeaving, leaveAfterCelebration } = useCompletionLeaving(
    save,
    settings.showOnboardingChecklist,
  );
  const collapsed = useSyncExternalStore(subscribeToGetStartedCollapse, getStartedCollapsed);
  const reveal = usePanelReveal(settings.showOnboardingChecklist && !completionLeaving);
  const steps = sessionSteps(gateways, registry.accounts.length > 0, settings.firstRequestServed);
  const done = steps.filter((step) => step.state === 'done').length;
  const celebrating = useCompletionCelebration(done === steps.length, leaveAfterCelebration);

  if (!reveal.rendered) {
    return null;
  }

  return (
    <div
      className={reveal.leaving ? 'checklist-panel-leaving' : 'checklist-panel'}
      data-get-started-panel=""
    >
      <div className="min-h-0 overflow-hidden">
        <section
          aria-labelledby={headingId}
          className="relative rounded-panel border border-line-subtle bg-surface-card px-3 pt-2.5 pb-1.5"
        >
          {celebrating && confettiBurst()}
          <ChecklistHeader collapsed={collapsed} headingId={headingId} />
          {progressLine(done, steps.length)}
          {foldRows(
            collapsed,
            <ChecklistSteps
              steps={steps}
              onSkip={() => {
                save({ showOnboardingChecklist: false });
              }}
            />,
          )}
        </section>
      </div>
    </div>
  );
}
