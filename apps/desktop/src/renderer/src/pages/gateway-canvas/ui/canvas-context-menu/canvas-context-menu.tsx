import type { ReactNode } from 'react';

import { useState } from 'react';

import type { MenuAction } from '../../../../shared/ui';

import { ContextMenu } from '../../../../shared/ui';

type CanvasContextMenuProps = {
  /** The acts a subject offers, asked for once the press has said what it landed on. */
  actsFor: (subject: string | undefined) => readonly MenuAction[];
  /** Told which card a keyboard reached, which is the stage's own focus reading. */
  noticeCardFocus: (nodeId: string) => void;
  /** The canvas and everything standing over it. */
  children: ReactNode;
};

function nameUnder(target: EventTarget | null, selector: string): string | undefined {
  const stood = target instanceof Element ? target.closest(selector) : null;

  return stood?.getAttribute('data-id') ?? undefined;
}

/**
 * What a press landed on, which is a card, a cable, or the canvas behind both.
 *
 * @summary The library marks every card and every cable in the document with the id the graph
 * gave it, and the stage already reads a focused card the same way. Reading the press off the
 * document rather than off the library's own handlers keeps one reading for both gestures, and it
 * answers a press on the canvas itself, which no card handler ever sees.
 */
function subjectUnder(target: EventTarget | null): string | undefined {
  return nameUnder(target, '.react-flow__node') ?? nameUnder(target, '.react-flow__edge');
}

/**
 * The canvas, standing as the surface a right-click asks its acts of.
 *
 * @summary Reach for it around the stage rather than around each card, because a card is drawn by
 * the flow library and has no wrapper of its own to hang a menu on, and because the canvas behind
 * the cards has to answer as well. The subject is read on the way down, so the acts are already
 * settled by the time the menu paints. Every subject offers something, so a press never opens an
 * empty box.
 */
export function CanvasContextMenu({ actsFor, noticeCardFocus, children }: CanvasContextMenuProps) {
  const [subject, setSubject] = useState<string | undefined>(undefined);

  return (
    <ContextMenu
      className="relative flex min-w-0 flex-1 overflow-hidden bg-surface-content dot-grid"
      items={actsFor(subject)}
      render={
        <section
          data-focus-group="spatial"
          onContextMenuCapture={(event) => {
            setSubject(subjectUnder(event.target));
          }}
          onFocusCapture={(event) => {
            const nodeId = nameUnder(event.target, '.react-flow__node');

            if (nodeId !== undefined) {
              noticeCardFocus(nodeId);
            }
          }}
        />
      }
    >
      {children}
    </ContextMenu>
  );
}
