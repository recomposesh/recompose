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
  /**
   * How the router being composed spreads, or nothing while the step that asks still stands.
   *
   * @summary Nothing is the unanswered state rather than a mode standing in for one, because the
   * mode is a step of its own: a draft holding a default would walk straight past the question and
   * store a router nobody chose.
   */
  routerMode?: RouterMode | undefined;
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
  | 'router'
  | 'router-mode';

export const STEP_ORDER: readonly RoutingStep[] = [
  'kind',
  'router-mode',
  'judge-provider',
  'judge-model',
  'provider',
  'model',
  'router',
];

function targetStep(props: RoutingPickerProps): RoutingStep {
  return props.target === undefined ? 'provider' : 'model';
}

function judgeUnanswered(judge: JudgePick['binding']): RoutingStep | undefined {
  if (judge === undefined || judge.accountId === '') {
    return 'judge-provider';
  }

  return judge.providerModel === '' ? 'judge-model' : undefined;
}

/**
 * Which answer a conditional draft still owes, walked in the order the mode needs them.
 *
 * @summary The judge leads, because it is the answer that makes this mode the mode it is: a person
 * who just chose conditional chose to have requests read, and asking where the rest goes before
 * naming what does the reading opens on the one question the other two modes would also ask. The
 * else branch follows, since a router that cannot say where the rest goes is a table the stored
 * shape refuses. Every answer given lands back on the mode, which is where the name is typed and
 * the save waits.
 */
function conditionalStep(props: RoutingPickerProps): RoutingStep {
  const owed = judgeUnanswered(props.judge.binding);

  if (owed !== undefined) {
    return owed;
  }

  if (props.target === undefined) {
    return 'provider';
  }

  return props.providerModel === '' ? 'model' : 'router';
}

/**
 * Which step a router draft stands on, which is the mode until one is chosen.
 *
 * @summary The mode leads because it decides what the router still owes: the two spreading modes
 * owe nothing and rest on the name, while conditional owes an else branch and a judge. Asking it on
 * a step of its own rather than as a strip above the name is what lets the three modes stand as
 * rows a sentence wide, and what keeps a draft from storing a mode nobody picked.
 */
function routerStep(props: RoutingPickerProps): RoutingStep {
  if (props.routerMode === undefined) {
    return 'router-mode';
  }

  return props.routerMode === 'conditional' ? conditionalStep(props) : 'router';
}

/**
 * Which step the picker stands on, read out of what the draft already says.
 *
 * @summary A target already picked outranks the ask, so a draft written before the drawer offered
 * the two shapes opens on its model list rather than back at a question it has already answered.
 */
export function stepOf(props: RoutingPickerProps): RoutingStep {
  if (props.bindsThrough === undefined) {
    return props.target === undefined ? 'kind' : 'model';
  }

  return props.bindsThrough === 'router' ? routerStep(props) : targetStep(props);
}
