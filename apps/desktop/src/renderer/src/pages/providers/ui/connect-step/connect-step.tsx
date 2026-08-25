import type { ReactNode } from 'react';

import type { CatalogLead } from '../../../../entities/provider';

import { SheetActionSlot } from '../../../../shared/ui';
import { PickedIdentity } from '../picked-identity/picked-identity';

type ConnectStepProps = {
  /** The identity the form submits under, which the sheet's own act reaches across. */
  formId: string;
  /** The mark or glyph heading the step, carried over from the card a person picked. */
  lead: CatalogLead;
  /** The product the entry was picked as, standing as the step's heading. */
  title: string;
  /** One quiet line under the title, saying what the step reaches or spends. */
  caption: ReactNode;
  /** The fields this step asks for, which is the only part that differs between steps. */
  children: ReactNode;
  /** A quiet note under the fields, which a refusal stands beneath rather than replacing. */
  note?: ReactNode;
  /** What the draft is refused for, or nothing while it still stands. */
  refusal?: string | undefined;
  /** Whether every field the step needs has been answered. */
  ready: boolean;
  /** Whether a connect is already out, so a second press asks nothing twice. */
  pending: boolean;
  onSubmit: () => void;
};

function refusalLine(refusal: string | undefined): ReactNode {
  return refusal === undefined ? null : (
    <p className="mt-1.5 px-0.5 text-caption text-danger-ink" role="alert">
      {refusal}
    </p>
  );
}

/**
 * The anatomy every connect step shares, holding whichever fields its own way asks for.
 *
 * @summary Reach for it from any step under a picked catalog card. The picked product stands
 * centered over the fields, the refusal stands under them, and the act that settles the sheet
 * rides the sheet's foot beside Cancel. Only the fields differ between a key, a plan token, an
 * address and a port, so only the fields are passed in.
 */
export function ConnectStep({
  formId,
  lead,
  title,
  caption,
  children,
  note,
  refusal,
  ready,
  pending,
  onSubmit,
}: ConnectStepProps) {
  return (
    <>
      <form
        className="flex flex-col py-2"
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <PickedIdentity lead={lead} title={title}>
          {caption}
        </PickedIdentity>
        <div className="mt-4 field-box">{children}</div>
        {note}
        {refusalLine(refusal)}
      </form>
      <SheetActionSlot>
        <button
          className="push-button-primary focus-ring-wide"
          disabled={pending || !ready}
          form={formId}
          type="submit"
        >
          Connect
        </button>
      </SheetActionSlot>
    </>
  );
}
