let arrowDrivingFocus = false;

/**
 * Whether the focus event being handled came from an arrow-key walk rather than a Tab.
 *
 * @summary A sidebar row activates itself when an arrow walks onto it, because moving the
 * selection is what the arrow asked for, while a Tab passing through on its way somewhere else
 * asked for nothing. The flag holds only for the synchronous focus dispatch of one walk step.
 */
export function focusDrivenByArrow(): boolean {
  return arrowDrivingFocus;
}

/** Moves focus as an arrow walk, so the landing control knows an arrow drove it there. */
export function drivenFocus(next: HTMLElement): void {
  arrowDrivingFocus = true;

  try {
    next.focus();
  } finally {
    arrowDrivingFocus = false;
  }
}
