import type { ReactNode } from 'react';

import { useNavigate } from '@tanstack/react-router';

import type { ConnectAsk } from '../../pages/onboarding';

import { SetupSurface } from '../../pages/onboarding';
import { ProviderCatalogSheet } from '../../pages/providers';
import { collapseGetStarted } from '../../widgets/get-started';

/**
 * The connect sheet setup asks for, drawn here because the sheet belongs to the providers page.
 *
 * @summary Setup owns the question and the providers page owns the answer, so the shell that can
 * see both hands one to the other rather than either growing a copy of the other's surface.
 */
function setupConnectSheet(ask: ConnectAsk | undefined, onSettled: () => void): ReactNode {
  return (
    <ProviderCatalogSheet
      kind={ask?.kind ?? 'subscription'}
      onOpenChange={(open) => {
        if (!open) {
          onSettled();
        }
      }}
      open={ask !== undefined}
      openedOn={ask?.entry}
    />
  );
}

/**
 * Setup, wired to the two things only the shell can reach.
 *
 * @summary Setup cannot navigate and cannot fold a widget's panel, so the shell does both on its
 * behalf. The landing happens the moment the gateway reaches disk, which puts what a person built
 * behind the last two steps rather than after them. The checklist folds because somebody who just
 * walked the whole wizard would only be offered the same steps a second time.
 */
export function SetupInTheShell() {
  const navigate = useNavigate();

  return (
    <SetupSurface
      connectSheet={setupConnectSheet}
      onBuilt={(gateway) => {
        collapseGetStarted();
        void navigate({ to: '/gateways/$slug', params: { slug: gateway.slug } });
      }}
    />
  );
}
