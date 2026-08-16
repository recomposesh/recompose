import type { SubscriptionProviderId, SubscriptionTool } from '@recompose/contracts';

import { useSuspenseQuery } from '@tanstack/react-query';

import { subscriptionsQueryOptions, subscriptionToolsQueryOptions } from '../../../../shared/api';
import { SubscriptionAccountRow } from '../subscription-account-row/subscription-account-row';
import { SubscriptionsEmptyState } from '../subscriptions-empty-state/subscriptions-empty-state';

function shellLineFor(
  tools: readonly SubscriptionTool[],
  provider: SubscriptionProviderId,
): string | undefined {
  return tools.find((tool) => tool.provider === provider)?.shellSetupLine;
}

/**
 * The subscription accounts this machine holds, or the state explaining the kind before one exists.
 *
 * @summary The setup lines are read once here rather than per row, because they are one answer for
 * the whole screen and a row asking for its own would ask the same question as many times as a
 * person has accounts.
 */
export function SubscriptionsSurface() {
  const { data: views } = useSuspenseQuery(subscriptionsQueryOptions);
  const { data: tools } = useSuspenseQuery(subscriptionToolsQueryOptions);

  if (views.length === 0) {
    return <SubscriptionsEmptyState />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {views.map((view) => (
        <SubscriptionAccountRow
          key={view.id}
          shellSetupLine={shellLineFor(tools, view.provider)}
          view={view}
        />
      ))}
    </ul>
  );
}
