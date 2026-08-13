import type {
  MachineCredentialReading,
  IpcChannel,
  RecomposeIpc,
  SubscriptionAccountView,
  SubscriptionTool,
} from '@recompose/contracts';

import { subscriptionPlanNames } from '@recompose/contracts';

export type SubscriptionHandlers = Pick<
  RecomposeIpc,
  Extract<IpcChannel, `subscriptions:${string}`>
>;

export const noSubscriptions: readonly SubscriptionAccountView[] = [];
export const noTools: readonly SubscriptionTool[] = [];

export const connectedSubscription: SubscriptionAccountView = {
  id: 's1',
  provider: 'anthropic',
  label: 'Anthropic',
  signedInAs: 'dev@example.com',
  plan: 'Max',
  standing: 'connected',
  provenance: 'sign-in',
  active: true,
};

/** The two channels the one plan with no tool of its own travels, answered as a shown code. */
function copilotChannels(
  landCopilot: SubscriptionHandlers['subscriptions:copilot-await'],
): Pick<SubscriptionHandlers, 'subscriptions:copilot-code' | 'subscriptions:copilot-await'> {
  return {
    'subscriptions:copilot-code': async () =>
      Promise.resolve({
        ok: true as const,
        value: { userCode: 'ABCD-1234', verificationUri: 'https://github.com/login/device' },
      }),
    'subscriptions:copilot-await': landCopilot,
  };
}

/**
 * The subscription half of the fake bridge, answering every act with the list it left behind.
 *
 * @summary The real channels each answer with the whole view list, because the pointer that says
 * which account is active moves outside the renderer. These answers keep that shape, so a screen
 * reading them never learns to re-ask.
 */
export function subscriptionHandlers(
  seededViews: readonly SubscriptionAccountView[],
  seededTools: readonly SubscriptionTool[],
  onAccountLanded?: (id: string, provider: SubscriptionAccountView['provider']) => void,
  seededReading?: MachineCredentialReading,
): SubscriptionHandlers {
  let held = [...seededViews];
  let nextSubscriptionNumber = held.length + 1;

  const asHeld = async () => Promise.resolve({ ok: true as const, value: held });

  const land = async (
    provider: SubscriptionAccountView['provider'],
    provenance: SubscriptionAccountView['provenance'],
  ) => {
    const id = `s${nextSubscriptionNumber}`;

    nextSubscriptionNumber += 1;
    onAccountLanded?.(id, provider);
    held = [
      ...held,
      {
        id,
        provider,
        label: subscriptionPlanNames[provider],
        standing: 'connected',
        provenance,
        active: held.length === 0,
      },
    ];

    return asHeld();
  };

  return {
    'subscriptions:list': asHeld,
    'subscriptions:tools': async () => Promise.resolve({ ok: true, value: [...seededTools] }),
    'subscriptions:sign-in': async ({ provider }) => land(provider, 'sign-in'),
    ...copilotChannels(async () => land('copilot', 'sign-in')),
    'subscriptions:restore': async ({ id }) => {
      held = held.map((view) => (view.id === id ? { ...view, standing: 'connected' } : view));

      return asHeld();
    },
    'subscriptions:activate': async ({ id }) => {
      held = held.map((view) => ({ ...view, active: view.id === id }));

      return asHeld();
    },
    'subscriptions:detect': async () =>
      Promise.resolve({ ok: true, value: seededReading ?? { holds: 'nothing' } }),
    'subscriptions:adopt': async ({ provider }) => land(provider, 'machine'),
  };
}
