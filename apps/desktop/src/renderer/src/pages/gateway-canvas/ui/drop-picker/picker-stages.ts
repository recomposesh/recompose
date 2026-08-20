import {
  BACK_TO_THE_JUDGE,
  BACK_TO_THE_MODE,
  BACK_TO_THE_PROVIDER,
  ELSE_BRANCH_HEADING,
  JUDGE_HEADING,
  judgeModelsHeading,
  ROUTING_MODE_HEADING,
  targetModelsHeading,
} from '../../lib/routing-step-wording';

/**
 * Which of the three things an account pick is naming, which is the whole of what its wording says.
 *
 * @summary One list of stored accounts answers three different questions along a nested router's
 * walk, and only the heading tells a person which one they are answering. Carrying it on the stage
 * rather than in a step of its own is what keeps the list, its search, and its refusal written once.
 */
type AccountAsked = 'else' | 'judge' | 'target';

/** Which part of the binding the ask is asking for, and what the parts before it settled on. */
export type PickerStage =
  | { step: 'account'; asks: AccountAsked }
  | { step: 'kind' }
  | { step: 'provider-model'; accountId: string; asks: AccountAsked }
  | { step: 'router-mode' };

/**
 * Each stage in the order a walk meets them, which is what tells a step forward from a step back.
 *
 * @summary The account and model stages appear once per question they answer rather than once
 * each, because a nested conditional meets both twice and a walk that read the second judge step
 * as a step backwards would slide the wrong way under a person moving forwards.
 */
export const STAGE_ORDER: readonly string[] = [
  'kind',
  'router-mode',
  'account:judge',
  'provider-model:judge',
  'account:else',
  'provider-model:else',
  'account:target',
  'provider-model:target',
];

/** Which stage this is, told apart by the question it asks as well as the list it offers. */
export function stageKey(stage: PickerStage): string {
  return 'asks' in stage ? `${stage.step}:${stage.asks}` : stage.step;
}

/** How one stage reads: what it asks, what its search offers, and the way back out of it. */
export type StageWording = {
  heading: string;
  searchLabel: string;
  nothingMatched: string;
  stepBack: string;
};

const ACCOUNT_HEADINGS: Record<AccountAsked, string> = {
  else: ELSE_BRANCH_HEADING,
  judge: JUDGE_HEADING,
  target: 'Connected providers',
};

const ACCOUNT_STEPS_BACK: Record<AccountAsked, string> = {
  else: BACK_TO_THE_JUDGE,
  judge: BACK_TO_THE_MODE,
  target: 'Select router or provider',
};

const MODEL_HEADINGS: Record<AccountAsked, (name: string | undefined) => string> = {
  else: targetModelsHeading,
  judge: judgeModelsHeading,
  target: targetModelsHeading,
};

const MODEL_STEPS_BACK: Record<AccountAsked, string> = {
  else: BACK_TO_THE_PROVIDER,
  judge: BACK_TO_THE_JUDGE,
  target: BACK_TO_THE_PROVIDER,
};

const ACCOUNT_SEARCH = {
  searchLabel: 'Search providers',
  nothingMatched: 'No provider matches that.',
};

const MODEL_SEARCH = { searchLabel: 'Search models', nothingMatched: 'No model matches that.' };

const KIND_WORDING: StageWording = {
  heading: 'Bind this model to',
  searchLabel: 'Search kinds',
  nothingMatched: 'Nothing binds here.',
  stepBack: '',
};

const MODE_WORDING: StageWording = {
  heading: ROUTING_MODE_HEADING,
  searchLabel: 'Search modes',
  nothingMatched: 'No mode matches that.',
  stepBack: 'Bind this model to something else',
};

/**
 * How the stage standing open reads, which the heading, the search, and the chevron all take from.
 *
 * @summary The account a person picked names the model list rather than the step doing so, because
 * the step is the same question on every walk and the account is what makes this asking of it
 * theirs. A stage nobody has picked an account for yet reads as the plain question.
 */
export function stageWording(stage: PickerStage, pickedName: string | undefined): StageWording {
  if (stage.step === 'kind') {
    return KIND_WORDING;
  }

  if (stage.step === 'router-mode') {
    return MODE_WORDING;
  }

  if (stage.step === 'account') {
    return {
      ...ACCOUNT_SEARCH,
      heading: ACCOUNT_HEADINGS[stage.asks],
      stepBack: ACCOUNT_STEPS_BACK[stage.asks],
    };
  }

  return {
    ...MODEL_SEARCH,
    heading: MODEL_HEADINGS[stage.asks](pickedName),
    stepBack: MODEL_STEPS_BACK[stage.asks],
  };
}
