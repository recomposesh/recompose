const CHAMFER_OUTER = 'M0.78 44 L12.57 0.75 L171.43 0.75 L183.22 44 L171.43 87.25 L12.57 87.25 Z';

const CHAMFER_INNER = 'M5.96 44 L16.39 5.75 L167.61 5.75 L178.04 44 L167.61 82.25 L16.39 82.25 Z';

/**
 * The silhouette a router wears in place of a rounded card, on the 184 by 88 box a node takes.
 *
 * @summary A router is the one node whose shape says what it is before a word is read, so both the
 * canvas and the setup diagram wear it and neither draws its own. The frame is drawn rather than
 * bordered because a border paints the four sides of a box and would lose its line along the two
 * diagonals. Each path runs half a stroke inside where its line belongs, the way a border paints
 * inside the box it bounds, and the two run exactly five pixels apart along every edge. Both read
 * the fill, line, and glow variables `node-card` settles, so one state table paints every card.
 *
 * A card wearing it takes `node-card-chamfer` and the wider text inset with it: a chamfer draws
 * its edges in toward the middle of every line, and the rounded inset runs a kicker into the
 * keyline.
 */
/**
 * What a card wearing the chamfer takes beside `node-card`.
 *
 * @summary The chamfer clears the card's own background so the drawn path can provide it, and it
 * draws its edges in toward the middle of every line, so the text needs a wider inset than a
 * rounded card's. Both facts belong to the shape, so they travel with it rather than being
 * remembered at each place one is worn.
 */
export const CHAMFERED_CARD = 'node-card-chamfer px-4.5';

export function NodeChamfer() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 size-full node-chamfer-frame"
      data-chamfer=""
      viewBox="0 0 184 88"
    >
      <path className="node-chamfer-fill" d={CHAMFER_OUTER} />
      <path className="node-chamfer-line" d={CHAMFER_INNER} />
    </svg>
  );
}
