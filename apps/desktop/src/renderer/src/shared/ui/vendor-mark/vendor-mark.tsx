import type { BrandMarkName, VendorDrawingProps } from '../brand-mark/brand-mark-inventory';

import { BrandMark } from '../brand-mark/brand-mark';
import { Icon } from '../icon/icon';

type VendorMarkProps = VendorDrawingProps & {
  /** The vendor's own mark, or nothing where recompose draws none for it. */
  name: BrandMarkName | undefined;
};

/**
 * The drawing at the head of anything a vendor stands behind, mark or no mark.
 *
 * @summary Reach for it wherever a vendor is named and its mark might be missing. A row that drew
 * nothing there would sit a glyph-width out of line with every row beside it, and a reader scanning
 * a column of logos reads that gap as a different kind of thing. One stand-in serves every such
 * row, so a vendor recompose holds no drawing for looks the same on the canvas, in a filter, and on
 * a plan card.
 */
export function VendorMark({ name, className = 'size-5', variant = 'color' }: VendorMarkProps) {
  if (name === undefined) {
    return <Icon className={`${className} text-ink-tertiary`} name="spark" />;
  }

  return <BrandMark className={className} name={name} variant={variant} />;
}
