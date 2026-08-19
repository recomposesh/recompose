import { nameOfRouterMode } from '@recompose/contracts';

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
    "A judge reads each request and names the branch it belongs to. Anything it can't place lands on the else branch.",
};

export const modeOptions = [
  { value: 'failover', label: nameOfRouterMode('failover') },
  { value: 'round-robin', label: nameOfRouterMode('round-robin') },
] as const satisfies readonly { value: RouterMode; label: string }[];
