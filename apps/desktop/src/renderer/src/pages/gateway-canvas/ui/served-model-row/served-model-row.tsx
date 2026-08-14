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

/**
 * What answers under this name, which is the account and the real model a request reaches.
 *
 * @summary The line carries the binding alone, because the id it used to lead with reads beside
 * the name instead: printing the model twice cost the binding the width it needed and left rows a
 * person opened this box to repair trailing off mid-account. A composition naming no target says
 * nothing here at all, since the standing beside the name already says it is unfinished.
 */
function boundLine(served: ServedModel): string | undefined {
  if (served.target.standing === 'incomplete') {
    return undefined;
  }

  const account = boundAccountName(served.target);

  return account === undefined ? served.providerModel : `${account} · ${served.providerModel}`;
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
 * One virtual model, read as the name it answers to over the target that answers under it.
 *
 * @summary Every row leads with the virtual-model star, because the list answers what the gateway
 * serves rather than which account kind stands behind each model. The name and the standing share
 * the top line and the binding takes the whole of the one below, so the fact a person opened this
 * box for keeps the panel's width instead of trailing off inside a longer sentence. The
 * client-facing id reads beside the name as the quieter fact, and gives its width up long before
 * the name does, because a row too narrow for both loses what a client sends rather than what a
 * person calls it. A target that left the registry keeps its warning, and its binding stays whole
 * so a person can repair it. A pool that lost one target of several counts what left instead of
 * wearing the broken binding's word, because a request under this name still gets served and the
 * row would otherwise send a person to repair something that works. A composition naming no target
 * prints no binding line, since nothing stands there to name.
 */
export function ServedModelRow({ served }: ServedModelRowProps) {
  const word = standingWord(served.target);
  const bound = boundLine(served);

  return (
    <li className="flex min-h-sheet-row items-center gap-2.5 border-b border-line-faint px-3 py-1.5 last:border-b-0">
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center text-virtual-model"
      >
        <Icon className="size-3.5" name="spark" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-control font-medium text-ink">{served.displayName}</span>
          <span className="min-w-0 flex-1 truncate font-mono text-mono-caption text-ink-secondary">
            {served.id}
          </span>
          {word === undefined ? null : <StatusChip tone="attention" word={word} />}
        </span>
        {bound === undefined ? null : (
          <span className="truncate font-mono text-mono-value text-ink-secondary">{bound}</span>
        )}
      </span>
      <CopyButton announcement="Model id copied." label="Copy model id" value={served.id} />
    </li>
  );
}
