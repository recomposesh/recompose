import type { Account } from '@recompose/contracts';
import type { ReactNode } from 'react';

import type { JudgeBinding } from '../../lib/conditional-draft';
import type { ModelListReading } from '../../lib/model-draft';

import { accountName } from '../../../../entities/account';
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
};

/** What the bound account reads as, keeping its id where the registry no longer holds it. */
function boundName(accounts: readonly Account[], accountId: string): string {
  const held = accounts.find((account) => account.id === accountId);

  return held === undefined ? accountId : accountName(held);
}

function restingJudge(props: JudgeSectionProps): ReactNode {
  return (
    <div className="field-box">
      {factRow('Provider', boundName(props.accounts, props.bound.accountId))}
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
      <p className="mt-2 px-1 text-caption text-ink-secondary">{JUDGE_ADVICE}</p>
    </>
  );
}
