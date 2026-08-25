import { claudeCodeKeepsModelId, claudeShapedModelId } from '@recompose/contracts';

const SKIPPED_ID_HINT = 'Claude Code lists only ids carrying claude or anthropic.';

/**
 * The quiet word about which ids a caller's own picker will surface, where one applies.
 *
 * @summary An id outside the words Claude Code reads for serves every client that asks for it by
 * name and appears in that one picker for nobody. The name stays free, because the hint belongs
 * beside the derived id rather than as a rule about what a person may type. An id with nothing in
 * it says nothing, so a field a person has yet to fill does not open already carrying a word.
 */
export function discoveryHint(wireId: string): string | undefined {
  return wireId === '' || claudeCodeKeepsModelId(wireId) ? undefined : SKIPPED_ID_HINT;
}

/**
 * The id the hint offers in place of the one a person typed, where the hint applies at all.
 *
 * @summary The offer is the fix rather than a second sentence about it, so the hint hands over an
 * id to take rather than asking a person to work one out. It stands only where the hint does,
 * because an id already surfaced has nothing to take.
 */
export function discoverySuggestion(wireId: string): string | undefined {
  return discoveryHint(wireId) === undefined ? undefined : claudeShapedModelId(wireId);
}

/**
 * What a stored definition reads under its facts, where the id it stands under is one that picker
 * skips.
 *
 * @summary A draft carries the hint beside a field a person is still typing in, and a stored one
 * has no such field open, so it says the same thing and names the press that opens one. It is the
 * only word an id stored before the derivation shaped ids ever gets, because nothing else on this
 * screen says why one model reaches a picker and the one beside it does not.
 */
export function discoveryNotice(storedId: string): string | undefined {
  const suggestion = discoverySuggestion(storedId);

  return suggestion === undefined
    ? undefined
    : `${SKIPPED_ID_HINT} Edit this id to ${suggestion} to have it listed.`;
}
