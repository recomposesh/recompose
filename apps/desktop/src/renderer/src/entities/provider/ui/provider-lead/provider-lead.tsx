import type { CatalogLead } from '../../model/catalog-lead';

import { BrandMark, Icon } from '../../../../shared/ui';

type ProviderLeadProps = {
  /** What this provider is drawn with: its own mark, or the glyph a provider without one takes. */
  lead: CatalogLead;
  /** How large the drawing stands, which the surface around it decides. */
  className?: string;
};

/**
 * The drawing at the head of a provider's row or tile, whichever kind of drawing it has.
 *
 * @summary Reach for it wherever a provider is named, so no two surfaces disagree about what one
 * looks like. A provider that publishes no mark leads with a glyph rather than with a drawing
 * recompose invented for it, and the glyph quiets while a real mark keeps its own colours.
 */
export function ProviderLead({ lead, className = 'size-4.5' }: ProviderLeadProps) {
  return 'mark' in lead ? (
    <BrandMark className={className} name={lead.mark} />
  ) : (
    <Icon className={`${className} text-ink-secondary`} name={lead.glyph} />
  );
}
