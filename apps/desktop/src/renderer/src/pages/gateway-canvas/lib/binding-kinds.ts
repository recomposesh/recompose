/** Which of the two shapes a virtual model's binding takes. */
export type BoundKind = 'router' | 'target';

/**
 * The two ways a virtual model reaches a provider, worded once for every ask that offers them.
 *
 * @summary The cable's picker and the drawer's first step ask one question, so its wording and the
 * order of its answers stand here rather than in either one. A person who learned the choice by
 * letting a cable go meets the same two rows, in the same order, composing from the drawer instead.
 */
export const BINDING_KINDS = [
  {
    id: 'router',
    name: 'Router',
    detail: 'Picks among several providers',
    glyph: 'branch',
    glyphTint: 'text-router',
  },
  {
    id: 'target',
    name: 'Provider',
    detail: 'One provider and one model',
    glyph: 'target',
    glyphTint: 'text-provider',
  },
] as const;

/** Which kind a picked row stands for, since a list of options answers in strings. */
export function boundKindOf(picked: string): BoundKind {
  return picked === 'router' ? 'router' : 'target';
}
