export type NoteKind = 'plain' | 'flat' | 'notehead';

export type Note = {
  letter: string;
  kind: NoteKind;
  staggerMs: number;
  shiftPx: number;
};

const STAGGER_STEP_MS = 25;
const letters = new Intl.Segmenter();
const STAFF_SHIFTS = [-2, 1, -1, 2, 0];

function kindOf(letter: string): NoteKind {
  if (letter === 'b') return 'flat';
  if (letter === 'd') return 'notehead';

  return 'plain';
}

export function noteLetters(label: string): Note[] {
  return [...letters.segment(label)].map(({ segment: letter }, index) => ({
    letter,
    kind: kindOf(letter),
    staggerMs: index * STAGGER_STEP_MS,
    shiftPx: STAFF_SHIFTS[(index + letter.charCodeAt(0)) % STAFF_SHIFTS.length] ?? 0,
  }));
}
