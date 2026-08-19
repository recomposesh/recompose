import type { JudgePick, RoutingPickerProps } from './picker-asks';

import { useStepTransition } from '../../../../shared/lib';
import { PickerStep } from '../picker-step/picker-step';
import { STEP_ORDER, stepOf } from './picker-asks';

export type { JudgePick, RoutingPickerProps };

/**
 * Where a virtual model routes, settled one step at a time in a single box.
 *
 * @summary It opens on the same ask a released cable opens, because a person composing from the
 * drawer wants the choices a person composing on the canvas gets: someone who means to build a
 * router first never has to detour through a provider they did not want. Answering with a router
 * ends the picking, since a router is born empty and fills by cable. Answering with a provider
 * walks on to the models that provider serves, because a binding needs both. A conditional router
 * walks on too, because that mode is born naming a judge and an else child.
 *
 * The box takes the height the drawer has left and scrolls its own list, rather than growing to
 * whatever the list needs and letting the drawer scroll instead. A person reading providers keeps
 * the fields above them and the save below them in place while they read.
 */
export function RoutingPicker(props: RoutingPickerProps) {
  const step = stepOf(props);
  const transition = useStepTransition(step, STEP_ORDER);

  return (
    <div className="flex min-h-0 flex-1 flex-col field-box">
      <div className={`flex min-h-0 flex-1 flex-col ${transition}`} key={step}>
        <PickerStep ask={props} step={step} />
      </div>
    </div>
  );
}
