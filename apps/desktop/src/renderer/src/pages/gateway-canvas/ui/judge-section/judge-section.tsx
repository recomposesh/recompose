import type { ReactNode } from 'react';

import type { JudgeBinding } from '../../lib/conditional-draft';
import type { OptionGroup } from '../option-list/option-list';

import { JUDGE_ADVICE } from '../../lib/router-modes';
import { OptionList } from '../option-list/option-list';
import { editableSectionHeading, factRow } from '../subject-shell/subject-shell';

export type JudgeSectionProps = {
  /** What the bound judge's account reads as, or its id where the registry no longer holds it. */
  accountName: string;
  /** The real model the bound judge runs. */
  providerModel: string;
  /** The accounts a judge can name, and nothing at all while the registry has yet to answer. */
  targets: readonly OptionGroup[] | undefined;
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
  /** The model ids the account being picked serves as of this look. */
  models: readonly string[];
  /** Sentence standing where a look at that account's model list answered nothing. */
  modelRefusal?: string | undefined;
  /** Receives the whole judge the person settled on, which is what lands the rebinding. */
  onBindJudge: (judge: JudgeBinding) => void;
};

function restingJudge(accountName: string, providerModel: string): ReactNode {
  return (
    <div className="field-box">
      {factRow('Provider', accountName)}
      {factRow('Model', providerModel)}
    </div>
  );
}

function pickingAccount(props: JudgeSectionProps): ReactNode {
  if (props.targets === undefined) {
    return null;
  }

  return (
    <OptionList
      groups={props.targets}
      nothingMatched="No provider matches that."
      onPick={props.onPicking}
      picked={undefined}
      searchLabel="Search providers"
    />
  );
}

function pickingModel(props: JudgeSectionProps, accountId: string): ReactNode {
  if (props.modelRefusal !== undefined) {
    return (
      <p className="px-1 py-1.5 text-caption text-danger-ink" role="alert">
        {props.modelRefusal}
      </p>
    );
  }

  return (
    <OptionList
      focusSearch
      groups={[{ options: props.models.map((id) => ({ id, name: id })) }]}
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
      {picking === undefined
        ? restingJudge(props.accountName, props.providerModel)
        : editingJudge(props, picking)}
      <p className="mt-2 px-1 text-caption text-ink-secondary">{JUDGE_ADVICE}</p>
    </>
  );
}
