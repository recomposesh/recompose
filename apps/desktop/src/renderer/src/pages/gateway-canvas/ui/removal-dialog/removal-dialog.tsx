import type { ReactNode } from 'react';

import type { RemovalAsked } from '../gateway-canvas-page/removal-flow';

import { shownAsAskModal } from '../../../../shared/lib';
import { Button } from '../../../../shared/ui';

const REMOVAL_HEADING = 'removal-asked-heading';

/**
 * What each removal question calls its subject and what it says leaving costs.
 *
 * @summary A route node reads by where it stands rather than only by what it is: the entry takes
 * the definition's whole binding with it, while a node below the entry leaves the ladder holding
 * it and everything else there keeps serving. Saying that at the question is the only place a
 * person can still change their mind.
 */
const REMOVAL_WORDING = {
  'virtual-model': {
    subject: 'virtual model',
    consequence: 'The definition leaves the gateway, and clients stop being served under its id.',
  },
  gateway: {
    subject: 'gateway',
    consequence: 'The gateway stops serving, and its whole composition leaves this app.',
  },
  target: {
    subject: 'target',
    consequence: 'The binding releases, and the virtual model returns to the canvas as a draft.',
  },
  'child-target': {
    subject: 'target',
    consequence:
      'The target leaves the router holding it, and everything else that router holds keeps serving.',
  },
  router: {
    subject: 'router',
    consequence:
      'The whole ladder goes with it, and the virtual model returns to the canvas as a draft.',
  },
  'child-router': {
    subject: 'router',
    consequence:
      'The router leaves the ladder holding it, and every child standing under it goes too.',
  },
} as const;

type RemovalDialogProps = {
  /** The question a press raised, or nothing while the canvas stands unasked. */
  removal: RemovalAsked | undefined;
};

/**
 * The removal question standing over the canvas, or nothing while no press asked one.
 *
 * @summary Render it from the page, because the question covers the whole surface rather than the
 * card that raised it. It names the subject and what removing it costs before the destructive
 * press is reachable, so nothing on this canvas leaves unannounced.
 */
export function RemovalDialog({ removal }: RemovalDialogProps): ReactNode {
  if (removal === undefined) {
    return null;
  }

  const { kind, name, onCancel, onConfirm } = removal;
  const wording = REMOVAL_WORDING[kind];

  return (
    <dialog
      aria-labelledby={REMOVAL_HEADING}
      className="m-auto w-80 menu-surface p-4"
      onCancel={onCancel}
      ref={shownAsAskModal}
    >
      <p className="text-control font-semibold text-ink" id={REMOVAL_HEADING}>
        Delete the {wording.subject} &quot;{name}&quot;?
      </p>
      <p className="mt-1 text-detail text-ink-secondary">{wording.consequence}</p>
      <div className="mt-3 flex justify-end gap-2">
        <Button onPress={onCancel}>Cancel</Button>
        <Button glyph="trash" onPress={onConfirm} variant="danger">
          Delete
        </Button>
      </div>
    </dialog>
  );
}
