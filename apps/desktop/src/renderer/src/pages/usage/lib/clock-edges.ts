/** The clock one instant stands at, as a time field prints it. */
export function clockOf(at: number): string {
  const stamp = new Date(at);

  return `${String(stamp.getHours()).padStart(2, '0')}:${String(stamp.getMinutes()).padStart(2, '0')}`;
}

/** The same instant with its clock moved, which is how a time field edits an edge. */
export function atClock(at: number, clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number);
  const moved = new Date(at);

  moved.setHours(hours ?? 0, minutes ?? 0, 0, 0);

  return moved.getTime();
}
