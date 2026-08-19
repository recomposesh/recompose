import type { ReactNode } from 'react';

import type { OptionGroup } from '../option-list/option-list';
import type { JudgePick, RoutingPickerProps, RoutingStep } from '../routing-picker/picker-asks';

import { Button } from '../../../../shared/ui';
import { BINDING_KINDS, boundKindOf } from '../../lib/binding-kinds';
import { JUDGE_ADVICE } from '../../lib/router-modes';
import { NoProviderNote } from '../no-provider-note/no-provider-note';
import { OptionList } from '../option-list/option-list';
import { RouterDraftFields } from '../router-draft-fields/router-draft-fields';

const KIND_GROUPS: readonly OptionGroup[] = [{ options: BINDING_KINDS }];

type StepBack = { label: string; onPress: () => void };

/**
 * The heading strip a step wears, carrying the way out of it where one stands behind it.
 *
 * @summary It rules a line under itself and keeps the same height whether or not the chevron is
 * there, so the list below starts at the same place on every step and walking between them never
 * shifts the rows a person is reading.
 */
function stepChevron({ label, onPress }: StepBack): ReactNode {
  return (
    <Button
      aria-label={label}
      glyph="chevron"
      glyphClassName="-translate-y-px rotate-90"
      onPress={onPress}
      variant="icon-secondary"
    />
  );
}

function stepHeader(heading: string, back: StepBack | undefined): ReactNode {
  return (
    <div className="flex min-h-9 items-center gap-1.5 border-b border-line-faint px-3 py-2">
      {back === undefined ? null : stepChevron(back)}
      <p className="drawer-picker-heading">{heading}</p>
    </div>
  );
}

function stepPanel(heading: string, back: StepBack | undefined, body: ReactNode): ReactNode {
  return (
    <>
      {stepHeader(heading, back)}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">{body}</div>
    </>
  );
}

function accountControl(
  targets: readonly OptionGroup[] | undefined,
  picked: string | undefined,
  onPick: (accountId: string) => void,
): ReactNode {
  if (targets === undefined) {
    return null;
  }

  if (targets.length === 0) {
    return <NoProviderNote />;
  }

  return (
    <OptionList
      groups={targets}
      nothingMatched="No provider matches that."
      onPick={onPick}
      picked={picked}
      searchLabel="Search providers"
    />
  );
}

function refusalLine(refusal: string): ReactNode {
  return (
    <p
      className="rounded-control border border-danger/30 bg-danger/10 px-2.5 py-2 text-caption text-ink"
      role="alert"
    >
      {refusal}
    </p>
  );
}

function modelControl(
  models: readonly string[],
  picked: string,
  refusal: string | undefined,
  onPick: (providerModel: string) => void,
): ReactNode {
  if (refusal !== undefined) {
    return refusalLine(refusal);
  }

  return (
    <OptionList
      focusSearch
      groups={[{ options: models.map((id) => ({ id, name: id })) }]}
      nothingMatched="No model matches that."
      onPick={onPick}
      picked={picked === '' ? undefined : picked}
      searchLabel="Search models"
    />
  );
}

function targetModelControl(props: RoutingPickerProps): ReactNode {
  if (props.modelRefusal !== undefined) {
    return refusalLine(props.modelRefusal);
  }

  if (props.target === undefined) {
    return <p className="px-2 py-1.5 text-detail text-ink-secondary">Pick a provider first.</p>;
  }

  return modelControl(props.models, props.providerModel, undefined, props.onPickModel);
}

function modelStep(props: RoutingPickerProps): ReactNode {
  return stepPanel(
    props.targetName === undefined ? 'Pick a model' : `Models ${props.targetName} serves`,
    { label: 'Select a different provider', onPress: props.onSelectDifferentProvider },
    targetModelControl(props),
  );
}

function judgeProviderStep(props: RoutingPickerProps): ReactNode {
  return stepPanel(
    'Pick the judge',
    { label: 'Change what this router falls back to', onPress: props.onSelectDifferentProvider },
    <>
      <p className="px-2 py-1.5 text-detail text-ink-secondary">{JUDGE_ADVICE}</p>
      {accountControl(props.targets, props.judge.binding?.accountId, props.judge.onPickAccount)}
    </>,
  );
}

function judgeModelStep(props: RoutingPickerProps): ReactNode {
  const { judge } = props;

  return stepPanel(
    judge.name === undefined ? "Pick the judge's model" : `Models ${judge.name} judges with`,
    { label: 'Select a different judge', onPress: judge.onSelectDifferentProvider },
    modelControl(
      judge.models,
      judge.binding?.providerModel ?? '',
      judge.modelRefusal,
      judge.onPickModel,
    ),
  );
}

/**
 * What the judge settled on, said on the step a person lands back on once it is whole.
 *
 * @summary The draft foot already previews the else binding, so the judge would otherwise be the
 * one answer a person gave and never sees again before saving.
 */
function judgeSummary(judge: JudgePick): ReactNode {
  const binding = judge.binding;

  if (binding === undefined || binding.providerModel === '') {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-col gap-1">
      <span className="drawer-picker-heading">Judge</span>
      <p className="truncate font-mono text-mono-value text-ink-secondary">
        {`${judge.name ?? binding.accountId} · ${binding.providerModel}`}
      </p>
    </div>
  );
}

/**
 * The step a draft rests on once a person answered the ask with a router.
 *
 * @summary A router is born holding no child, so this step has nothing left to pick and says what
 * the save will leave standing instead. The pool is filled by cable on the canvas rather than here,
 * because a router picks among several providers and this box takes one answer at a time. A
 * conditional router is the exception: it is born naming a judge and an else child, so choosing
 * that mode walks on to both and lands back here once they stand.
 */
function routerStep(props: RoutingPickerProps): ReactNode {
  return stepPanel(
    'Routes through a router',
    { label: 'Bind this model to something else', onPress: props.onReopenKind },
    <RouterDraftFields
      judge={judgeSummary(props.judge)}
      mode={props.routerMode}
      name={props.routerName}
      onModeChange={props.onRouterModeChange}
      onNameChange={props.onRouterNameChange}
    />,
  );
}

function providerStep(props: RoutingPickerProps): ReactNode {
  return stepPanel(
    'Pick a provider',
    { label: 'Bind this model to something else', onPress: props.onReopenKind },
    accountControl(props.targets, props.target, props.onPickTarget),
  );
}

function elseBranchStep(props: RoutingPickerProps): ReactNode {
  return stepPanel(
    'Pick the else branch',
    { label: 'Choose a different routing mode', onPress: props.onReopenRouterMode },
    accountControl(props.targets, props.target, props.onPickTarget),
  );
}

function kindStep(props: RoutingPickerProps): ReactNode {
  return stepPanel(
    'Bind this model to',
    undefined,
    <OptionList
      groups={KIND_GROUPS}
      nothingMatched="Nothing binds here."
      onPick={(picked) => {
        props.onPickKind(boundKindOf(picked));
      }}
      picked={undefined}
      searchLabel="Search kinds"
    />,
  );
}

const SPREADING_BODIES: Record<RoutingStep, (props: RoutingPickerProps) => ReactNode> = {
  kind: kindStep,
  router: routerStep,
  provider: providerStep,
  model: modelStep,
  'judge-provider': judgeProviderStep,
  'judge-model': judgeModelStep,
};

const CONDITIONAL_BODIES: Partial<Record<RoutingStep, (props: RoutingPickerProps) => ReactNode>> = {
  provider: elseBranchStep,
};

/**
 * The body one step stands as, which the conditional mode renames where it asks for something else.
 *
 * @summary Only the provider step reads differently under conditional, because a person picking
 * there is naming what catches everything rather than the one thing the model binds to.
 */
export function PickerStep({
  step,
  ask,
}: {
  step: RoutingStep;
  ask: RoutingPickerProps;
}): ReactNode {
  const renamed = ask.routerMode === 'conditional' ? CONDITIONAL_BODIES[step] : undefined;

  return (renamed ?? SPREADING_BODIES[step])(ask);
}
