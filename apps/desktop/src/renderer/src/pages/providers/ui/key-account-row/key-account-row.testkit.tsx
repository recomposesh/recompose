import type { CredentialedAccount } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from 'vitest-browser-react';

import type { BridgeParameters } from '../../../../shared/testing';

import { chooseNamedAct, installFakeBridge } from '../../../../shared/testing';
import { KeyAccountRow } from './key-account-row';

export { addressedByHand, stored, storedBeforeTheMask } from './key-account-row.fixtures';
export { pressNamedControl as press } from '../../../../shared/testing';

export async function renderRow(account: CredentialedAccount, parameters: BridgeParameters = {}) {
  installFakeBridge({
    accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [account] },
    ...parameters,
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ul>
        <KeyAccountRow account={account} />
      </ul>
    </QueryClientProvider>,
  );
}

export async function choose(action: string): Promise<void> {
  await chooseNamedAct('Actions for build', action);
}

export async function heldAccounts() {
  const answer = await window.recompose['accounts:list']();

  return answer.ok ? answer.value.accounts : [];
}
