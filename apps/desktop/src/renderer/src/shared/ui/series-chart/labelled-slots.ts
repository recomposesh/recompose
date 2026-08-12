const MOST_LABELS = 7;

/**
 * The slots along the axis that print a label, paced so a wide window names a reading few.
 *
 * @summary A day of hour buckets crowds its axis long before the labels collide, so the stride
 * comes from the count rather than from what fits. The newest slot always keeps its label, which
 * is what names the trailing edge of the window a person is reading.
 */
export function labelledSlots(slots: readonly number[]): readonly number[] {
  const stride = Math.max(1, Math.ceil(slots.length / MOST_LABELS));
  const paced = slots.filter((_, index) => index % stride === 0);
  const newest = slots.at(-1);

  return newest === undefined || paced.includes(newest) ? paced : [...paced, newest];
}
