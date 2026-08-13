import type { BrandMarkName, IconName } from '../../../shared/ui';

/**
 * What a row is drawn with: a vendor's own mark, or the glyph its category stands under.
 *
 * @summary A mark recompose can draw is not a provider recompose can connect, so the drawing is
 * stated per row rather than derived from the identity. A category and a product publishing no
 * mark both name a glyph here, which is the rule rather than a fallback.
 */
export type CatalogLead = { mark: BrandMarkName } | { glyph: IconName };
