const CURVE_SAMPLES = 240;

/**
 * The line the browser actually painted for one cable, walked end to end in screen coordinates.
 *
 * @operation The reading comes from the path's own curve rather than from the arithmetic an edge
 * used to place its furniture, so a pill that drifts off the line cannot agree with the very
 * measure meant to catch it.
 */
function paintedCurve(cable: SVGPathElement): DOMPoint[] {
  const painted = cable.getScreenCTM();
  const total = cable.getTotalLength();

  if (painted === null) {
    throw new Error('the story drew no cable to walk');
  }

  return Array.from({ length: CURVE_SAMPLES + 1 }, (_, step) => {
    const at = cable.getPointAtLength((total * step) / CURVE_SAMPLES);

    return new DOMPoint(at.x, at.y).matrixTransform(painted);
  });
}

/**
 * How far off its cable one piece of furniture is sitting, in painted pixels.
 *
 * @summary Reach for it in any story asking whether a cable's label still rides the line it names.
 * The comparison is taken beside the pill rather than at the anchor the edge computed, because the
 * question a person asks of the screen is whether the two look joined.
 */
export function sagOffTheCable(pill: { x: number; y: number }, cable: SVGPathElement): number {
  const beside = paintedCurve(cable).reduce((closest, at) =>
    Math.abs(at.x - pill.x) < Math.abs(closest.x - pill.x) ? at : closest,
  );

  return Math.abs(pill.y - beside.y);
}

/**
 * The pill one cable on the pane is carrying, found by the word it reads.
 *
 * @summary Reach for it rather than a plain text query: the inspector prints the same branch words
 * beside the canvas, so a query over the whole story matches the panel as readily as the cable.
 */
export function branchPillOn(canvasElement: HTMLElement, word: string): Element {
  const riding = canvasElement.querySelector('.react-flow__edgelabel-renderer') ?? canvasElement;
  const held = [...riding.querySelectorAll('span, button')].find(
    (pill) => pill.textContent.trim() === word,
  );

  if (held === undefined) {
    throw new Error(`no cable on the pane carries a ${word} pill`);
  }

  return held;
}

/**
 * The one cable a two-card story drew, handed over as the path element it is.
 *
 * @summary Reach for it after the wait rather than subscripting the list, so a story never has to
 * assert away the undefined a subscript hands back.
 */
export function oneCableOn(canvasElement: HTMLElement): SVGPathElement {
  const drawn = canvasElement.querySelector<SVGPathElement>('.react-flow__edge > path');

  if (drawn === null) {
    throw new Error('the story drew no cable');
  }

  return drawn;
}

/** How far off the nearest cable on the whole pane a pill is sitting. */
export function sagOffEveryCable(
  pill: { x: number; y: number },
  canvasElement: HTMLElement,
): number {
  const drawn = [...canvasElement.querySelectorAll<SVGPathElement>('.react-flow__edge > path')];

  return Math.min(...drawn.map((cable) => sagOffTheCable(pill, cable)));
}
