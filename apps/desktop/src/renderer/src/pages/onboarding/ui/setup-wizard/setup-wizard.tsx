import type { ReactNode } from 'react';

import { Dialog } from '@base-ui/react/dialog';
import { useEffect } from 'react';

import type { SetupStep } from '../../model/setup-step';

import { setupSurfaceStood } from '../../../../shared/lib';
import { setupStepReads } from '../../model/setup-step';

type SetupWizardProps = {
  /** Whether setup holds the window. */
  open: boolean;
  /** The step setup stands on, which the caller advances rather than the surface. */
  step: SetupStep;
  /** The step itself. */
  children: ReactNode;
};

/**
 * The surface setup holds the window with.
 *
 * @summary Nothing here dismisses setup. Leaving records a standing that never returns on its own,
 * so an outside press and an Escape both leave the surface where it stood, and only a control a
 * person took on purpose settles it. Base UI's dialog answers Escape itself, which is why the
 * surface rides it rather than a native dialog, whose `showModal` would hand Escape a default the
 * app would fight on every step.
 *
 * The surface stops short of the window's chrome band, so the platform window controls stay
 * operable and the window stays draggable while setup stands.
 */
export function SetupWizard({ open, step, children }: SetupWizardProps) {
  useEffect(() => {
    setupSurfaceStood(open);

    return () => {
      setupSurfaceStood(false);
    };
  }, [open]);

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Backdrop className="setup-scrim" />
        <Dialog.Popup className="setup-surface" data-setup-step={step}>
          <Dialog.Title className="sr-only">{setupStepReads(step)}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
