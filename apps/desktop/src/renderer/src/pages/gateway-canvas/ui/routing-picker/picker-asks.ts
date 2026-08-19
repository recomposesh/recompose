import type { BoundKind } from '../../lib/binding-kinds';
import type { JudgeBinding } from '../../lib/conditional-draft';
import type { RouterMode } from '../../lib/routing-edits';
import type { OptionGroup } from '../option-list/option-list';

/**
 * Everything the judge sub-pick asks for and answers with, gathered as the one binding it is.
 *
 * @summary Grouped rather than spread across seven props, because the judge is one thing a person
 * picks and a caller handing six of the seven would be handing a half-bound judge.
 */
export type JudgePick = {
  /** The judge as it stands, or nothing while the draft has yet to name an account for it. */
  binding: JudgeBinding | undefined;
  /** What the picked account reads as, which names whose list the models come from. */
  name: string | undefined;
  /** The model ids the picked account serves as of this look. */
  models: readonly string[];
  /** Sentence standing where a look at the judge's model list answered nothing. */
  modelRefusal?: string | undefined;
  /** Receives the account the person picked for the judge. */
  onPickAccount: (accountId: string) => void;
  /** Receives the real model the person picked for the judge. */
  onPickModel: (providerModel: string) => void;
  /** Returns the picker to the judge's provider choices. */
  onSelectDifferentProvider: () => void;
};

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
  /** Returns the picker to the mode strip, from a step a mode with more to answer walked to. */
  onReopenRouterMode: () => void;
  /** The judge a conditional router reads its requests through, and how a person picks one. */
  judge: JudgePick;
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

/** One of the steps the picker walks, named for the answer it is standing there to collect. */
export type RoutingStep =
  | 'judge-model'
  | 'judge-provider'
  | 'kind'
  | 'model'
  | 'provider'
  | 'router';

export const STEP_ORDER: readonly RoutingStep[] = [
  'kind',
  'router',
  'provider',
  'model',
  'judge-provider',
  'judge-model',
];

function spreadingStep(props: RoutingPickerProps): RoutingStep {
  if (props.target !== undefined) {
    return 'model';
  }

  if (props.bindsThrough === undefined) {
    return 'kind';
  }

  return props.bindsThrough === 'router' ? 'router' : 'provider';
}

/**
 * Which answer a conditional draft still owes, walked in the order the mode needs them.
 *
 * @summary The else branch leads, because a router that cannot say where the rest goes is a table
 * the stored shape refuses, and the judge follows it. Every answer given lands back on the mode,
 * which is where the name is typed and the save waits.
 */
function judgeStep(judge: JudgePick['binding']): RoutingStep {
  if (judge === undefined || judge.accountId === '') {
    return 'judge-provider';
  }

  return judge.providerModel === '' ? 'judge-model' : 'router';
}

function conditionalStep(props: RoutingPickerProps): RoutingStep {
  if (props.target === undefined) {
    return 'provider';
  }

  return props.providerModel === '' ? 'model' : judgeStep(props.judge.binding);
}

/**
 * Which step the picker stands on, read out of what the draft already says.
 *
 * @summary A target already picked outranks the ask, so a draft written before the drawer offered
 * the two shapes opens on its model list rather than back at a question it has already answered.
 */
export function stepOf(props: RoutingPickerProps): RoutingStep {
  const conditional = props.bindsThrough === 'router' && props.routerMode === 'conditional';

  return conditional ? conditionalStep(props) : spreadingStep(props);
}
