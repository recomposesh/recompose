function rendered(element: Element | null | undefined): Element {
  if (element === null || element === undefined) {
    throw new Error('the story rendered nothing to measure');
  }

  return element;
}

/**
 * The style the browser actually painted on an element a story looked up.
 *
 * @summary Reach for it in a play function that checks a value the design fixes. It fails loudly
 * when the lookup found nothing, so a silent null never reads as a passing measurement.
 */
export function paintedStyle(element: Element | null | undefined): CSSStyleDeclaration {
  return getComputedStyle(rendered(element));
}

/**
 * The box the browser actually laid out for an element a story looked up.
 *
 * @summary Reach for it when the design fixes a width or a height rather than a declaration.
 */
export function paintedBox(element: Element | null | undefined): DOMRect {
  return rendered(element).getBoundingClientRect();
}

/**
 * Sizes a story's pane to the width a scenario narrows it to.
 *
 * @summary Reach for it in a play function that walks a surface down the widths a small window
 * leaves it, so every drop-order story narrows its pane the same way.
 */
export function narrowed(pane: Element | null, width: number): void {
  const held = rendered(pane);

  if (!(held instanceof HTMLElement)) {
    throw new Error('the story rendered a pane that cannot be narrowed');
  }

  held.style.width = `${String(width)}px`;
}

/**
 * Whether an element holds its whole reading inside its own box.
 *
 * @summary Reach for it beside `narrowed`: a surface that sheds or truncates as its pane narrows
 * proves it by never laying out wider than the box it was given.
 */
export function fitsItsPane(element: Element | null): boolean {
  return rendered(element).scrollWidth <= rendered(element).clientWidth;
}
