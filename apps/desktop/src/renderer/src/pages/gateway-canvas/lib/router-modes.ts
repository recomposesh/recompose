import { nameOfRouterMode } from '@recompose/contracts';

import type { IconName } from '../../../shared/ui';
import type { RouterMode } from './routing-edits';

/**
 * What each mode costs and wins, in the words every surface that offers the choice prints.
 *
 * @summary Under failover the sentence says which end wins; under round-robin it names the
 * prompt-cache cost of rotation at the point of choice, because that cost is the reason to weigh
 * one mode against the other. The drawer offers this choice while a router is still being composed
 * and the inspector offers it afterwards, so both read the same words rather than two drafts of
 * them: a person who chose on one surface and returns on the other is reading their own reason.
 */
export const modeSentences: Record<RouterMode, string> = {
  failover:
    'The topmost healthy provider answers. Each child below it stands in only when everything above it fails.',
  'round-robin':
    'Requests alternate across the children. This spreads the load, and each switch costs a prompt cache hit.',
  conditional:
    "A judge reads each request and names the branch it belongs to. What it reads but can't place lands on the else branch. A judge that can't answer refuses the request.",
};

/**
 * The mark each mode leads its row with, drawn from the marks the canvas already uses.
 *
 * @summary A stack says the children are ordered and the top one answers; a rotation says the turn
 * moves on with every request; the branch is the router's own kicker mark, which is the one a person
 * has already met on a conditional card. They are decoration rather than vocabulary: the row's name
 * carries the mode, so a glyph that drifted would mislead the eye without ever reaching a reader.
 */
export const modeOptions = [
  { value: 'failover', label: nameOfRouterMode('failover'), glyph: 'stack' },
  { value: 'round-robin', label: nameOfRouterMode('round-robin'), glyph: 'renew' },
  { value: 'conditional', label: nameOfRouterMode('conditional'), glyph: 'branch' },
] as const satisfies readonly { value: RouterMode; label: string; glyph: IconName }[];

/**
 * Why a small model makes the better judge, said wherever a person binds one.
 *
 * @summary The drawer binds a judge while composing and the inspector rebinds one afterwards, so
 * both say it in the same words rather than two drafts of the same advice.
 */
export const JUDGE_ADVICE =
  'Fast, cheap models judge best. The judge only names a branch, and every request waits on its answer.';

/** How often a conditional router asks its judge, which is the whole of what the toggle moves. */
export type JudgingRhythm = 'every-request' | 'once-per-conversation';

/**
 * What each judging rhythm does, in the words the toggle offering the choice prints.
 *
 * @summary Keyed like `modeSentences` and read the same way: the sentence describes the rhythm a
 * person is standing in rather than fixed helper text. One sentence each, saying what the setting
 * does rather than what it costs, because a person reading a toggle wants to know what moves. Both
 * name the server-state turn in a closing clause, because that turn holds its branch under either
 * rhythm and a person who read only the re-judging one would otherwise expect it to move.
 */
export const rejudgeSentences: Record<JudgingRhythm, string> = {
  'once-per-conversation':
    'A conversation stays on the branch it first earned, even when a turn resumes server-held state.',
  'every-request':
    'The judge picks a branch for every request, unless the turn resumes server-held state.',
};
