import type { Account } from '@recompose/contracts';
import type { ReactNode } from 'react';

import type { JudgeBinding } from '../../lib/conditional-draft';
import type { ModelListReading } from '../../lib/model-draft';

import { accountName } from '../../../../entities/account';
import { StatusChip } from '../../../../shared/ui';
import { JUDGE_ADVICE } from '../../lib/router-modes';
import { targetGroups } from '../../lib/target-groups';
import { OptionList } from '../option-list/option-list';
import { editableSectionHeading, factRow } from '../subject-shell/subject-shell';

export type JudgeSectionProps = {
  /** The registry the bound account reads its name against, and the judge can be picked from. */
  accounts: readonly Account[];
  /** The judge as it stands, which is blank on both halves while nobody has bound one. */
  bound: JudgeBinding;
  /**
   * Which account the edit has landed on, or nothing while the section rests.
   *
   * @summary An empty string is an edit standing open with no account picked yet, which is what
   * makes the provider list the first thing an edit shows. The owner holds it rather than this
   * section, because the model list belongs to whichever account it names.
   */
  picking: string | undefined;
  /** Receives the account the edit landed on, and nothing where the edit ended. */
  onPicking: (accountId: string | undefined) => void;
  /** What one look at the picked account's model list left this section to offer. */
  offered: ModelListReading;
  /** Receives the whole judge the person settled on, which is what lands the rebinding. */
  onBindJudge: (judge: JudgeBinding) => void;
  /**
   * Whether the router this judge advises is sending every request it takes to its else child.
   *
   * @summary A stored conditional router says this and a switch being defined never does, because
   * the router under a definition still spreads by the mode it was stored with and has no else to
   * land on. The definition's own foot says what that switch still owes instead.
   */
  routesEverythingToElse: boolean;
};

const ROUTES_NOTHING_BY_RULE =
  'This router routes nothing by rule. Every request lands on else until a judge binds.';

/**
 * What the bound account reads as, or the standing of one the registry no longer holds.
 *
 * @summary A stored id is not a name: nobody chose it and nobody has seen it, so printing it where
 * a provider belongs reads as a name a person simply does not recognize rather than as the trouble
 * it is. The judge card already says this in these words, and one wording is what lets a person
 * match the row to the card.
 */
function boundProvider(accounts: readonly Account[], accountId: string): ReactNode {
  const held = accounts.find((account) => account.id === accountId);

  return held === undefined ? (
    <StatusChip tone="danger" word="Account left the registry" />
  ) : (
    accountName(held)
  );
}

function restingJudge(props: JudgeSectionProps): ReactNode {
  return (
    <div className="field-box">
      {factRow('Provider', boundProvider(props.accounts, props.bound.accountId))}
      {factRow('Model', props.bound.providerModel)}
    </div>
  );
}

function pickingAccount(props: JudgeSectionProps): ReactNode {
  return (
    <OptionList
      groups={targetGroups([...props.accounts])}
      nothingMatched="No provider matches that."
      onPick={props.onPicking}
      picked={undefined}
      searchLabel="Search providers"
    />
  );
}

function pickingModel(props: JudgeSectionProps, accountId: string): ReactNode {
  const { refusal, offered } = props.offered;

  if (refusal !== undefined) {
    return (
      <p className="px-1 py-1.5 text-caption text-danger-ink" role="alert">
        {refusal}
      </p>
    );
  }

  return (
    <OptionList
      focusSearch
      groups={[{ options: offered.map((id) => ({ id, name: id })) }]}
      nothingMatched="No model matches that."
      onPick={(providerModel) => {
        props.onBindJudge({ accountId, providerModel });
        props.onPicking(undefined);
      }}
      picked={undefined}
      searchLabel="Search models"
    />
  );
}

function walkingBack(label: string, onPress: () => void): ReactNode {
  return (
    <button
      className="hit-area mt-1.5 rounded-control focus-ring px-1 text-caption font-medium text-accent-ink"
      onClick={onPress}
      type="button"
    >
      {label}
    </button>
  );
}

function editingJudge(props: JudgeSectionProps, picking: string): ReactNode {
  const back =
    picking === ''
      ? walkingBack('Keep the judge it has', () => {
          props.onPicking(undefined);
        })
      : walkingBack('Select a different provider', () => {
          props.onPicking('');
        });

  return (
    <div className="flex flex-col field-box p-1">
      {picking === '' ? pickingAccount(props) : pickingModel(props, picking)}
      {back}
    </div>
  );
}

/**
 * The model a conditional router reads its requests through, and how a person rebinds one.
 *
 * @summary It rests as two facts and edits as the same two picks the drawer walks, because a judge
 * is an account and a real model wherever it is bound and a second way of saying that would be a
 * second thing to keep in step. The advice under it names the shape of model that suits the job:
 * the judge answers with one branch label and every request waits on it, so a large model spends
 * the caller's latency on a one word answer. Picking a model is what lands the rebinding, since a
 * provider alone is half a judge and half a judge would refuse every request it read.
 */
export function JudgeSection(props: JudgeSectionProps) {
  const { picking } = props;

  return (
    <>
      {editableSectionHeading('Judge', picking !== undefined, () => {
        props.onPicking('');
      })}
      {picking === undefined ? restingJudge(props) : editingJudge(props, picking)}
      {props.routesEverythingToElse ? (
        <p className="mt-2 px-1 text-caption text-ink-secondary" role="status">
          {ROUTES_NOTHING_BY_RULE}
        </p>
      ) : null}
      <p className="mt-2 px-1 text-caption text-ink-secondary">{JUDGE_ADVICE}</p>
    </>
  );
}
