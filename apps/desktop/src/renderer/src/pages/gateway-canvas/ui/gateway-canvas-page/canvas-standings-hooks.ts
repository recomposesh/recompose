import type { RefObject } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { BindingOutcome } from '../../lib/cable-announcements';
import type { ModelListReading } from '../../lib/model-draft';
import type { CanvasStandings, DragWatch, PickerStanding } from './canvas-standings';

import { providerModelsQueryOptions } from '../../../../shared/api';
import { inspectorOpen, toggleInspector } from '../../../../shared/lib';
import { modelListReading } from '../../lib/model-draft';
import {
  escapeSettling,
  escapeThrowsTheDragAway,
  isEscape,
  pickedAccountId,
  standingsOver,
} from './canvas-standings';
import { editingText } from './canvas-wiring';

/** Backs the canvas standings with the state a render reads them from. */
export function useCanvasStandings(): CanvasStandings {
  const [selection, setSelection] = useState<string | undefined>(undefined);
  const [picker, setPicker] = useState<PickerStanding | undefined>(undefined);
  const [removing, setRemoving] = useState<string | undefined>(undefined);
  const [announced, setAnnounced] = useState<BindingOutcome | undefined>(undefined);
  const [refusal, setRefusal] = useState<string | undefined>(undefined);

  return standingsOver(
    { selection, picker, removing, announced, refusal },
    {
      writeSelection: setSelection,
      writePicker: setPicker,
      movePicker: setPicker,
      writeRemoving: setRemoving,
      writeAnnounced: setAnnounced,
      writeRefusal: setRefusal,
    },
  );
}

/** What the picker's second stage may offer: the models, or the refusal that stands for them. */
export function usePickerModels(picker: PickerStanding | undefined): ModelListReading {
  const accountId = pickedAccountId(picker);
  const look = useQuery({
    ...providerModelsQueryOptions(accountId),
    enabled: accountId !== '',
  });

  return modelListReading(look.data);
}

/**
 * Throws away a cable drag the moment Esc asks, before anything lands.
 *
 * @summary Letting the pointer go for the person is what stops the release from opening a picker
 * at wherever the cable happened to hang.
 */
export function useEscapeCancelledDrag(dragging: RefObject<DragWatch>): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!escapeThrowsTheDragAway(event.key, dragging.current)) {
        return;
      }

      dragging.current.escaped = true;
      document.dispatchEvent(new MouseEvent('mouseup'));
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dragging]);
}

/**
 * Puts away whatever Escape names on the canvas, reading the screen for who else answers it.
 *
 * @summary The key is checked before the screen is, because a text field mid-edit and an open
 * dialog are asked about on every press otherwise.
 */
export function useEscapeSettledCanvas(
  standings: CanvasStandings,
  dragging: RefObject<DragWatch>,
): void {
  const { picker, setPicker, select } = standings;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isEscape(event.key)) {
        return;
      }

      const settling = escapeSettling(picker, {
        dragging: dragging.current.inFlight,
        editing: editingText(document.activeElement),
        dialogOpen: document.querySelector('dialog[open]') !== null,
      });

      if (settling === 'nobody') {
        return;
      }

      if (settling === 'picker') {
        setPicker(undefined);

        return;
      }

      select(undefined);

      if (inspectorOpen()) {
        toggleInspector();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [picker, setPicker, select, dragging]);
}
