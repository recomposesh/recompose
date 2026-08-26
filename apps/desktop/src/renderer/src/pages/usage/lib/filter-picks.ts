/**
 * Whether the filter keeps one member, which it does for every member while it stands on everything.
 *
 * @summary An empty selection is the one word the model has for everything, so every row under it
 * reads kept rather than blank. A blank row would say a person had let that member go, which is the
 * opposite of what the window is showing them.
 */
export function memberKept(selected: readonly string[], key: string): boolean {
  return selected.length === 0 || selected.includes(key);
}

function narrowedOnto(
  selected: readonly string[],
  key: string,
  every: readonly string[],
): readonly string[] {
  if (selected.length === 0) {
    return every.filter((member) => member !== key);
  }

  if (selected.includes(key)) {
    return selected.filter((member) => member !== key);
  }

  return [...selected, key];
}

/**
 * The members the filter keeps once a person picks one row.
 *
 * @summary Picking a row while the filter stands on everything lets that member go rather than
 * standing alone on it, because every row read kept before the press. A selection that grew to
 * cover every member collapses back to empty, so everything keeps one representation rather than
 * two that no reader could tell apart.
 */
export function keptAfterPick(
  selected: readonly string[],
  key: string,
  every: readonly string[],
): readonly string[] {
  const kept = narrowedOnto(selected, key, every);
  const held = new Set(kept);

  return every.every((member) => held.has(member)) ? [] : kept;
}
