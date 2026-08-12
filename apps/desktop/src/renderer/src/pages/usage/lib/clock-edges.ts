/** The clock one instant stands at, as a time field prints it. */
export function clockOf(at: number): string {
  const stamp = new Date(at);

  return `${String(stamp.getHours()).padStart(2, '0')}:${String(stamp.getMinutes()).padStart(2, '0')}`;
}

function wholeClockPart(raw: string | undefined): number | undefined {
  const read = Number(raw);

  return raw !== undefined && raw !== '' && Number.isFinite(read) ? read : undefined;
}

/**
 * The same instant with its clock moved, which is how a time field edits an edge.
 *
 * @summary A time field with no native picker behind it degrades to a text box, so a clock that
 * reads as nothing leaves the edge where it already stood rather than moving it to an hour that
 * does not exist.
 */
export function atClock(at: number, clock: string): number {
  const [rawHours, rawMinutes] = clock.split(':');
  const hours = wholeClockPart(rawHours);

  if (hours === undefined) {
    return at;
  }

  const moved = new Date(at);

  moved.setHours(hours, wholeClockPart(rawMinutes) ?? 0, 0, 0);

  return moved.getTime();
}
