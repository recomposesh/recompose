import type { BrandMarkVariant } from '../../../../shared/ui';
import type { ConnectLead } from '../../model/connect-facts';

import { BrandMark, Icon } from '../../../../shared/ui';

type ClientLeadProps = {
  /** What this client is drawn with: its own mark, or the glyph a tool without one takes. */
  lead: ConnectLead;
  /** Size classes, replacing the standing 16px square rather than adding to it. */
  className?: string;
  /** Whether a vendor mark takes its own colors or the ink around it. */
  variant?: BrandMarkVariant;
};

/**
 * The drawing at the head of a client's row, whichever kind of drawing that client has.
 *
 * @summary Reach for it wherever a client is named, so the rail and the pane beside it never
 * disagree about what a tool looks like. A tool that publishes no mark leads with a glyph rather
 * than with a drawing recompose invented for it.
 */
export function ClientLead({ lead, className = 'size-4', variant = 'color' }: ClientLeadProps) {
  return 'mark' in lead ? (
    <BrandMark className={className} name={lead.mark} variant={variant} />
  ) : (
    <Icon className={className} name={lead.glyph} />
  );
}
