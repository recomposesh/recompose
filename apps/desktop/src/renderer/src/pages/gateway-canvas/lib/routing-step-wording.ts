/**
 * What each step of a routing walk asks, in the words every surface that walks it prints.
 *
 * @summary The drawer composes a router and a cable nests one, and both walk the same questions in
 * the same order, so both read one set of words rather than two drafts of them: a person who
 * answered in the drawer and returns on the canvas is answering a question they already know.
 */
export const ROUTING_MODE_HEADING = 'Pick the routing mode';

/** What the step asking which model reads a conditional router's requests is called. */
export const JUDGE_HEADING = 'Pick the judge';

/** What the step asking where everything no rule placed goes is called. */
export const ELSE_BRANCH_HEADING = 'Pick the else branch';

/** The way back out of a step the mode question stands behind. */
export const BACK_TO_THE_MODE = 'Choose a different routing mode';

/** The way back out of a step the judge stands behind, which reaches the judge's provider list. */
export const BACK_TO_THE_JUDGE = 'Select a different judge';

/** The way back out of a step one picked account stands behind. */
export const BACK_TO_THE_PROVIDER = 'Select a different provider';

/** The models a picked judge offers, named by whose list they are. */
export function judgeModelsHeading(name: string | undefined): string {
  return name === undefined ? "Pick the judge's model" : `Models ${name} judges with`;
}

/** The models a picked account offers, named by whose list they are. */
export function targetModelsHeading(name: string | undefined): string {
  return name === undefined ? 'Pick a model' : `Models ${name} serves`;
}
