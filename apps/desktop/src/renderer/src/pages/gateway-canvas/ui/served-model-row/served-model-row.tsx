import type { ServedModel } from '../../model/served-models';

import { accountName } from '../../../../entities/account';
import { CopyButton, Icon, StatusChip } from '../../../../shared/ui';

type ServedModelRowProps = {
  /** The definition as the drawer reads it, target standing and all. */
  served: ServedModel;
};

function boundAccountName(target: ServedModel['target']): string | undefined {
  return target.standing === 'serving' || target.standing === 'thinned'
    ? accountName(target.account)
    : undefined;
}

function bindingLine(served: ServedModel): string {
  if (served.target.standing === 'incomplete') {
    return served.id;
  }

  const account = boundAccountName(served.target);

  return account === undefined
    ? `${served.id} → ${served.providerModel}`
    : `${served.id} → ${account} · ${served.providerModel}`;
}

function standingWord(target: ServedModel['target']): string | undefined {
  if (target.standing === 'serving') {
    return undefined;
  }

  if (target.standing === 'incomplete') {
    return 'no target yet';
  }

  if (target.standing === 'removed') {
    return 'target removed';
  }

  return target.lost === 1 ? '1 target removed' : `${String(target.lost)} targets removed`;
}

/**
 * One virtual model, read leading to trailing as the name it answers to and what serves it.
 *
 * @summary Every row leads with the virtual-model star, because the list answers what the gateway
 * serves rather than which account kind stands behind each model. A target that left the registry
 * keeps its warning, and the binding stays visible so a person can repair it. A pool that lost one
 * target of several counts what left instead of wearing the broken binding's word, because a
 * request under this name still gets served and the row would otherwise send a person to repair
 * something that works. A composition naming no target says it is unfinished and prints its name
 * alone, since nothing left it and an arrow into nothing points at nothing.
 */
export function ServedModelRow({ served }: ServedModelRowProps) {
  const word = standingWord(served.target);

  return (
    <li className="flex min-h-sheet-row items-center gap-2.5 border-b border-line-faint px-3 py-1.5 last:border-b-0">
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center text-virtual-model"
      >
        <Icon className="size-3.5" name="spark" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-control font-medium text-ink">{served.displayName}</span>
        <span className="truncate font-mono text-mono-value text-ink-secondary">
          {bindingLine(served)}
        </span>
      </span>
      {word === undefined ? null : <StatusChip tone="attention" word={word} />}
      <CopyButton announcement="Model id copied." label="Copy model id" value={served.id} />
    </li>
  );
}
