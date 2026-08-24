import type { CredentialedAccount } from '@recompose/contracts';

import { ACCOUNTS_VERSION } from '@recompose/contracts';

import type { BridgeParameters } from '../../../shared/testing';

import { renderUnderTheBridge } from '../../../shared/browser-testing';
import { KeyAccountRow } from '../ui/key-account-row/key-account-row';
import { chooseNamedAct } from './row-acts.testkit';

export {
  addressedByHand,
  stored,
  storedBeforeTheMask,
} from '../ui/key-account-row/key-account-row.fixtures';
export { pressNamedControl as press } from './row-acts.testkit';

export async function renderRow(account: CredentialedAccount, parameters: BridgeParameters = {}) {
  return renderUnderTheBridge(
    <ul>
      <KeyAccountRow account={account} />
    </ul>,
    { accounts: { schemaVersion: ACCOUNTS_VERSION, accounts: [account] }, ...parameters },
  );
}

export async function choose(action: string): Promise<void> {
  await chooseNamedAct('Actions for build', action);
}

export async function heldAccounts() {
  const answer = await window.recompose['accounts:list']();

  return answer.ok ? answer.value.accounts : [];
}
