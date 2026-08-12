/** The local midnight the month around one instant opens at. */
export function startOfMonth(at: number): number {
  const month = new Date(at);

  month.setDate(1);
  month.setHours(0, 0, 0, 0);

  return month.getTime();
}
