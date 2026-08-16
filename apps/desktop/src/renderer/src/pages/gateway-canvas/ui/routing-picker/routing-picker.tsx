import type { ReactNode } from 'react';

import type { BoundKind } from '../../lib/binding-kinds';
import type { RouterMode } from '../../lib/routing-edits';
import type { OptionGroup } from '../option-list/option-list';

import { useStepTransition } from '../../../../shared/lib';
import { Button } from '../../../../shared/ui';
import { BINDING_KINDS, boundKindOf } from '../../lib/binding-kinds';
import { NoProviderNote } from '../no-provider-note/no-provider-note';
import { OptionList } from '../option-list/option-list';
import { RouterDraftFields } from '../router-draft-fields/router-draft-fields';

const KIND_GROUPS: readonly OptionGroup[] = [{ options: BINDING_KINDS }];

export type RoutingPickerProps = {
  /**
   * The accounts a target can name, gathered under the kinds they are held as, and nothing at all
   * while the registry has yet to answer. An empty list is a registry that answered with nobody who
   * can serve, which is a state a person has to be told about rather than shown as a blank.
   */
  targets: readonly OptionGroup[] | undefined;
  /** Which shape the binding takes, or nothing while the person stands at the ask. */
  bindsThrough?: BoundKind | undefined;
  /** Receives the shape the person picked at the ask. */
  onPickKind: (kind: BoundKind) => void;
  /** Returns the picker to the ask that offers the two shapes. */
  onReopenKind: () => void;
  /** How the router being composed spreads, which stands at its born mode until a person moves it. */
  routerMode: RouterMode;
  /** Receives the mode the person landed on. */
  onRouterModeChange: (mode: RouterMode) => void;
  /** What the person called the router, which is empty while it answers to its mode. */
  routerName: string;
  /** Receives every keystroke in the router name field. */
  onRouterNameChange: (typed: string) => void;
  /** The account picked as the target, or nothing while none is. */
  target?: string | undefined;
  /** Receives the account the person picked. */
  onPickTarget: (accountId: string) => void;
  /** Returns the picker to the provider choices. */
  onSelectDifferentProvider: () => void;
  /** What the picked account reads as, which names whose list the models come from. */
  targetName?: string | undefined;
  /** The model ids the picked account serves as of this look. */
  models: readonly string[];
  /** The real model picked, which is empty while none is. */
  providerModel: string;
  /** Receives the model the person picked. */
  onPickModel: (providerModel: string) => void;
  /** Sentence standing where a look at the model list answered nothing. */
  modelRefusal?: string | undefined;
};

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

function targetControl(props: RoutingPickerProps): ReactNode {
  if (props.targets === undefined) {
    return null;
  }

  if (props.targets.length === 0) {
    return <NoProviderNote />;
  }

  return (
    <OptionList
      groups={props.targets}
      nothingMatched="No provider matches that."
      onPick={props.onPickTarget}
      picked={props.target}
      searchLabel="Search providers"
    />
  );
}

function modelControl(props: RoutingPickerProps): ReactNode {
  if (props.modelRefusal !== undefined) {
    return (
      <p
        className="rounded-control border border-danger/30 bg-danger/10 px-2.5 py-2 text-caption text-ink"
        role="alert"
      >
        {props.modelRefusal}
      </p>
    );
  }

  if (props.target === undefined) {
    return <p className="px-2 py-1.5 text-detail text-ink-secondary">Pick a provider first.</p>;
  }

  return (
    <OptionList
      focusSearch
      groups={[{ options: props.models.map((id) => ({ id, name: id })) }]}
      nothingMatched="No model matches that."
      onPick={props.onPickModel}
      picked={props.providerModel === '' ? undefined : props.providerModel}
      searchLabel="Search models"
    />
  );
}

function modelStep(props: RoutingPickerProps): ReactNode {
  return stepPanel(
    props.targetName === undefined ? 'Pick a model' : `Models ${props.targetName} serves`,
    { label: 'Select a different provider', onPress: props.onSelectDifferentProvider },
    modelControl(props),
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

/**
 * The step a draft rests on once a person answered the ask with a router.
 *
 * @summary A router is born holding no child, so this step has nothing left to pick and says what
 * the save will leave standing instead. The pool is filled by cable on the canvas rather than here,
 * because a router picks among several providers and this box takes one answer at a time.
 */
function routerStep(props: RoutingPickerProps): ReactNode {
  return stepPanel(
    'Routes through a router',
    { label: 'Bind this model to something else', onPress: props.onReopenKind },
    <RouterDraftFields
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
    targetControl(props),
  );
}

type RoutingStep = 'kind' | 'router' | 'provider' | 'model';

const STEP_ORDER: readonly RoutingStep[] = ['kind', 'router', 'provider', 'model'];

/**
 * Which step the picker stands on, read out of what the draft already says.
 *
 * @summary A target already picked outranks the ask, so a draft written before the drawer offered
 * the two shapes opens on its model list rather than back at a question it has already answered.
 */
function stepOf(props: RoutingPickerProps): RoutingStep {
  if (props.target !== undefined) {
    return 'model';
  }

  if (props.bindsThrough === undefined) {
    return 'kind';
  }

  return props.bindsThrough === 'router' ? 'router' : 'provider';
}

function stepBody(step: RoutingStep, props: RoutingPickerProps): ReactNode {
  if (step === 'kind') {
    return kindStep(props);
  }

  if (step === 'router') {
    return routerStep(props);
  }

  return step === 'provider' ? providerStep(props) : modelStep(props);
}

/**
 * Where a virtual model routes, settled one step at a time in a single box.
 *
 * @summary It opens on the same ask a released cable opens, because a person composing from the
 * drawer wants the choices a person composing on the canvas gets: someone who means to build a
 * router first never has to detour through a provider they did not want. Answering with a router
 * ends the picking, since a router is born empty and fills by cable. Answering with a provider
 * walks on to the models that provider serves, because a binding needs both.
 *
 * The box takes the height the drawer has left and scrolls its own list, rather than growing to
 * whatever the list needs and letting the drawer scroll instead. A person reading providers keeps
 * the fields above them and the save below them in place while they read.
 */
export function RoutingPicker(props: RoutingPickerProps) {
  const step = stepOf(props);
  const transition = useStepTransition(step, STEP_ORDER);

  return (
    <div className="flex min-h-0 flex-1 flex-col field-box">
      <div className={`flex min-h-0 flex-1 flex-col ${transition}`} key={step}>
        {stepBody(step, props)}
      </div>
    </div>
  );
}
