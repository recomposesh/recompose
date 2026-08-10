import type { ServedModel } from '../../model/served-models';

import { ServedModelRow } from '../served-model-row/served-model-row';

type ServesBoxProps = {
  /** Every virtual model the gateway serves, in the order the drawer reads down them. */
  served: readonly ServedModel[];
};

/**
 * What a gateway serves, or the sentence a gateway serving nothing reads instead.
 *
 * @summary The empty box points at the cable rather than offering a button, because the plus on
 * the canvas is the one add path and a second one here would compete with it.
 */
export function ServesBox({ served }: ServesBoxProps) {
  if (served.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 field-box px-4 py-5 text-center">
        <p className="text-control font-semibold text-ink-secondary">Nothing serves yet</p>
        <p className="text-detail text-ink-secondary">
          Pull a cable from the gateway&apos;s port to add a virtual model.
        </p>
      </div>
    );
  }

  return (
    <ul className="field-box">
      {served.map((model) => (
        <ServedModelRow key={model.id} served={model} />
      ))}
    </ul>
  );
}
