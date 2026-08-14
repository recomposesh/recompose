import { useViewport } from '@xyflow/react';

import type { XY } from '../../lib/canvas-positions';
import type { DropPickerProps } from '../drop-picker/drop-picker';

import { DropPicker } from '../drop-picker/drop-picker';

/** Everything the picker asks for, plus the card on the canvas it hangs off. */
export type AnchoredPickerProps = DropPickerProps & {
  /** Where the card the picker hangs off stands, in the flow's own coordinates. */
  seat: XY;
};

/**
 * The picker standing on its card, over every piece of canvas furniture.
 *
 * @summary Mount it inside the flow, because it reads the viewport to follow the card a person is
 * looking at. It stands in the pane's own coordinates rather than among the cards: the library
 * paints its corner furniture above every card there is, so a picker seated with the cards falls
 * under the map and the map takes the press meant for it. A question a gesture asked has to answer
 * a pointer wherever the gesture ended.
 */
export function AnchoredPicker({
  seat,
  stage,
  groups,
  refusal,
  onPickKind,
  onPickAccount,
  onPickProviderModel,
  onSelectDifferentProvider,
  onDismiss,
}: AnchoredPickerProps) {
  const { x, y, zoom } = useViewport();
  const stood = `translate(${String(x + seat.x * zoom)}px, ${String(y + seat.y * zoom)}px)`;

  return (
    <div
      className="pointer-events-auto absolute inset-s-0 top-0 z-20 h-22 w-46 origin-top-left"
      style={{ transform: `${stood} scale(${String(zoom)})` }}
    >
      <DropPicker
        groups={groups}
        onDismiss={onDismiss}
        onPickAccount={onPickAccount}
        onPickKind={onPickKind}
        onPickProviderModel={onPickProviderModel}
        onSelectDifferentProvider={onSelectDifferentProvider}
        refusal={refusal}
        stage={stage}
      />
    </div>
  );
}
