import type { BrandMarkName, IconName } from '../../../../shared/ui';

import { BrandMark, Icon } from '../../../../shared/ui';

/** What a row leads with, which says what kind of thing it names before the name is read. */
export type RowLeadFace = {
  /** The vendor mark, where the thing the row names has one. */
  mark?: BrandMarkName | undefined;
  /** The glyph it leads with instead, where it stands for a kind rather than a vendor. */
  glyph?: IconName | undefined;
  /** What tints that glyph, which is the color the canvas already draws this kind in. */
  glyphTint?: string | undefined;
};

/**
 * The mark or glyph a row opens with, drawn the same size wherever a list names a bindable thing.
 *
 * @summary The picker and the router's ladder both name accounts and routers, so what a row leads
 * with is decided here rather than twice: a person who learned a vendor by its mark in one list
 * meets the same mark, at the same size, in the other. A kind with no vendor wears the color the
 * canvas already draws its card in, which is what ties the row to the card it will become.
 */
export function RowLead({ mark, glyph, glyphTint }: RowLeadFace) {
  if (mark !== undefined) {
    return <BrandMark className="size-4.5 shrink-0" name={mark} />;
  }

  return (
    <Icon
      className={`size-3.75 shrink-0 ${glyphTint ?? 'text-ink-tertiary'}`}
      name={glyph ?? 'spark'}
    />
  );
}
