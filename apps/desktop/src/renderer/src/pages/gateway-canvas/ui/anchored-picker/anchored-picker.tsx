import { useStore, useViewport } from '@xyflow/react';

import type { XY } from '../../lib/canvas-positions';
import type { DropPickerProps } from '../drop-picker/drop-picker';

import { pickerStandsAt } from '../../lib/picker-placement';
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
 * a pointer wherever the gesture ended, which includes staying inside the pane: a card near the far
 * edge would otherwise hang its list past where anyone can reach it.
 */
export function AnchoredPicker({
  seat,
  stage,
  groups,
  refusal,
  onPickKind,
  onPickRouterMode,
  onPickAccount,
  onPickProviderModel,
  onStepBack,
  onDismiss,
  pickedName,
}: AnchoredPickerProps) {
  const viewport = useViewport();
  const pane = useStore((flow) => ({ width: flow.width, height: flow.height }));
  const stands = pickerStandsAt(seat, viewport, pane);
  const stood = `translate(${String(stands.x)}px, ${String(stands.y)}px)`;

  return (
    <div
      className="pointer-events-auto absolute inset-s-0 top-0 z-20 h-22 w-46 origin-top-left"
      style={{ transform: `${stood} scale(${String(viewport.zoom)})` }}
    >
      <DropPicker
        groups={groups}
        onDismiss={onDismiss}
        onPickAccount={onPickAccount}
        onPickKind={onPickKind}
        onPickProviderModel={onPickProviderModel}
        onPickRouterMode={onPickRouterMode}
        onStepBack={onStepBack}
        pickedName={pickedName}
        refusal={refusal}
        stage={stage}
      />
    </div>
  );
}
