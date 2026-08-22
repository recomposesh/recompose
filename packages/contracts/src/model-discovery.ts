const DISCOVERED_WORDS = ['claude', 'anthropic'] as const;

/**
 * Whether Claude Code's `/model` picker keeps a virtual model it read off `GET /v1/models`.
 *
 * @summary The rule is a substring anywhere in the id, folded case, not a prefix: Claude Code
 * matched on the opening of the id before v2.1.223, and the older reading hid the provider-prefixed
 * ids the gateway protocol documents as passing. A gateway that answers with an id carrying neither
 * word still serves it to every client that asks by name, and appears in that one picker for
 * nobody, which is the whole cost this answers for.
 */
export function claudeCodeKeepsModelId(id: string): boolean {
  const read = id.toLowerCase();

  return DISCOVERED_WORDS.some((word) => read.includes(word));
}

/**
 * The id a skipped one becomes for that picker to keep it.
 *
 * @summary An id the picker already keeps is handed back untouched rather than prefixed twice, so
 * offering the shaping to a person who took it once says nothing the second time. An id with
 * nothing in it shapes into nothing, because a bare `claude-` is an id the stored shape refuses.
 */
export function claudeShapedModelId(id: string): string {
  return id === '' || claudeCodeKeepsModelId(id) ? id : `claude-${id}`;
}
