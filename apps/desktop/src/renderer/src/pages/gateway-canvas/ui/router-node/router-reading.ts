/**
 * How many children the mono line says a router holds.
 *
 * @summary A router holding none says so in words rather than counting to zero, because a zero on
 * a card reads as a measurement where a person needs to see that the work is unfinished. The count
 * says children rather than targets, since a child of a router may be another router.
 */
export function childTally(count: number): string {
  if (count === 0) {
    return 'no child';
  }

  return count === 1 ? '1 child' : `${String(count)} children`;
}
