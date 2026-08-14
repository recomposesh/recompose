import { type NoteKind, noteLetters } from './note-letters';

declare module 'react' {
  interface CSSProperties {
    '--stagger'?: string;
    '--note-shift'?: string;
  }
}

const NOTE_CLASS: Record<NoteKind, string> = {
  plain: 'note',
  flat: 'note note-flat',
  notehead: 'note note-notehead',
};

export function NoteLabel({ label }: { label: string }) {
  return (
    <span aria-hidden="true" className="note-run">
      {noteLetters(label).map((note, index) => (
        <span
          key={`${note.letter}${String(index)}`}
          data-spot="text"
          className={NOTE_CLASS[note.kind]}
          style={{
            '--stagger': `${String(note.staggerMs)}ms`,
            '--note-shift': `${String(note.shiftPx)}px`,
          }}
        >
          {note.letter}
        </span>
      ))}
    </span>
  );
}
