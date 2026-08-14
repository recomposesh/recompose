import type { Account, GatewayConfig } from '@recompose/contracts';

import type { InspectorSubject } from '../gateway-canvas-page/canvas-subjects';

import { accountName } from '../../../../entities/account';

/** Which of the three filters the log list stands under, which is what an empty list says. */
export type LogFilter = 'all' | 'success' | 'errors';

const NOTHING_YET: Record<InspectorSubject['kind'], string> = {
  gateway: 'No requests from any client app yet.',
  draft: 'No requests from any client app yet.',
  'virtual-model': 'No requests through this virtual model yet.',
  cable: 'No requests through this virtual model yet.',
  router: 'No requests through this virtual model yet.',
  target: 'No requests reached this target yet.',
  'ghost-target': 'No requests reached the removed target yet.',
};

const NO_ERRORS_YET: Record<InspectorSubject['kind'], string> = {
  gateway: 'No errors from any client yet.',
  draft: 'No errors from any client yet.',
  'virtual-model': 'No errors through this virtual model yet.',
  cable: 'No errors through this virtual model yet.',
  router: 'No errors through this virtual model yet.',
  target: 'No errors from this target yet.',
  'ghost-target': 'No errors from the removed target yet.',
};

const NO_SUCCESSES_YET: Record<InspectorSubject['kind'], string> = {
  gateway: 'No successful requests from any client yet.',
  draft: 'No successful requests from any client yet.',
  'virtual-model': 'No successful requests through this virtual model yet.',
  cable: 'No successful requests through this virtual model yet.',
  router: 'No successful requests through this virtual model yet.',
  target: 'No successful requests from this target yet.',
  'ghost-target': 'No successful requests from the removed target yet.',
};

/** The sentence a list with no rows under this subject and filter stands as. */
export function nothingYetFor(subject: InspectorSubject, filter: LogFilter): string {
  if (filter === 'errors') {
    return NO_ERRORS_YET[subject.kind];
  }

  return filter === 'success' ? NO_SUCCESSES_YET[subject.kind] : NOTHING_YET[subject.kind];
}

/** What the drawer heading says a selection is, beside the name it answers to. */
export type SubjectHeading = {
  name: string;
  type: 'Gateway' | 'Virtual Model' | 'Binding' | 'Router' | 'Target' | 'Removed Target' | 'Draft';
};

function nameOrId(displayName: string, id: string): string {
  return displayName === '' ? id : displayName;
}

/**
 * Whether the heading names a selection after the virtual model that holds it.
 *
 * @summary A cable and a router each stand inside exactly one definition and carry no name of
 * their own that a person would recognize in a log heading, so both read as the model they belong
 * to, and the type beside the name is what says which of the three a person selected.
 */
function namedByItsModel(
  subject: InspectorSubject,
): subject is Extract<InspectorSubject, { kind: 'cable' | 'router' | 'virtual-model' }> {
  return subject.kind === 'virtual-model' || subject.kind === 'cable' || subject.kind === 'router';
}

function modelName(gateway: GatewayConfig, modelId: string): string {
  const model = gateway.virtualModels.find((held) => held.id === modelId);

  return model === undefined ? modelId : nameOrId(model.displayName, model.id);
}

function targetName(accounts: readonly Account[], accountId: string): string {
  const account = accounts.find((held) => held.id === accountId);

  return account === undefined ? accountId : nameOrId(accountName(account), accountId);
}

const SUBJECT_TYPE: Record<InspectorSubject['kind'], SubjectHeading['type']> = {
  gateway: 'Gateway',
  'virtual-model': 'Virtual Model',
  cable: 'Binding',
  router: 'Router',
  target: 'Target',
  'ghost-target': 'Removed Target',
  draft: 'Draft',
};

function unscopedName(gateway: GatewayConfig, kind: 'gateway' | 'draft'): string {
  return kind === 'draft' ? 'New virtual model' : nameOrId(gateway.displayName, gateway.slug);
}

function subjectName(
  gateway: GatewayConfig,
  accounts: readonly Account[],
  subject: InspectorSubject,
): string {
  if (namedByItsModel(subject)) {
    return modelName(gateway, subject.modelId);
  }

  return subject.kind === 'target' || subject.kind === 'ghost-target'
    ? targetName(accounts, subject.accountId)
    : unscopedName(gateway, subject.kind);
}

/** The name and the type the drawer heading reads a selection as. */
export function subjectHeading(
  gateway: GatewayConfig,
  accounts: readonly Account[],
  subject: InspectorSubject,
): SubjectHeading {
  return { name: subjectName(gateway, accounts, subject), type: SUBJECT_TYPE[subject.kind] };
}

/** The one key a selection scopes its rows by, which is what a list resets on. */
export function scopeKey(subject: InspectorSubject): string {
  if (namedByItsModel(subject)) {
    return `virtual-model:${subject.modelId}`;
  }

  return subject.kind === 'target' || subject.kind === 'ghost-target'
    ? `${subject.kind}:${subject.accountId}`
    : 'gateway';
}
