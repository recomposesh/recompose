const DOT_PITCH = 24;
const DOT_RADIUS = 8;

const GLYPHS: Record<string, string[]> = {
  r: ['....', '....', 'x.xx', 'xx..', 'x...', 'x...', 'x...', '....', '....'],
  e: ['....', '....', '.xx.', 'x..x', 'xxxx', 'x...', '.xxx', '....', '....'],
  c: ['....', '....', '.xxx', 'x...', 'x...', 'x...', '.xxx', '....', '....'],
  o: ['....', '....', '.xx.', 'x..x', 'x..x', 'x..x', '.xx.', '....', '....'],
  m: ['......', '......', 'xx.x..', 'x.x.x.', 'x.x.x.', 'x.x.x.', 'x.x.x.', '......', '......'],
  p: ['....', '....', 'x.xx', 'xx.x', 'x..x', 'xx.x', 'x.xx', 'x...', 'x...'],
  s: ['....', '....', '.xxx', 'x...', '.xx.', '...x', 'xxx.', '....', '....'],
};

const ACCENTS: Record<string, string> = {
  '0-4-0': 'fill-gateway',
  '2-2-1': 'fill-virtual-model',
  '4-3-2': 'fill-router',
  '5-6-3': 'fill-subscription',
  '7-4-2': 'fill-live',
  '8-2-3': 'fill-pending',
};

type Dot = { x: number; y: number; tone: string };

function rowDots(line: string, letterIndex: number, row: number, column: number): Dot[] {
  const dots: Dot[] = [];

  for (let cell = 0; cell < line.length; cell++) {
    if (line[cell] !== 'x') continue;
    dots.push({
      x: (column + cell) * DOT_PITCH + DOT_RADIUS,
      y: row * DOT_PITCH + DOT_RADIUS,
      tone: ACCENTS[`${letterIndex}-${row}-${cell}`] ?? 'fill-stage-bright',
    });
  }

  return dots;
}

function letterDots(glyph: string[], letterIndex: number, column: number): Dot[] {
  return glyph.flatMap((line, row) => rowDots(line, letterIndex, row, column));
}

function wordmarkDots(word: string) {
  const dots: Dot[] = [];
  let column = 0;

  for (const [letterIndex, letter] of word.split('').entries()) {
    const glyph = GLYPHS[letter];

    if (!glyph) continue;
    dots.push(...letterDots(glyph, letterIndex, column));
    column += (glyph[0]?.length ?? 0) + 1;
  }

  return { dots, columns: column - 1 };
}

const WORDMARK = wordmarkDots('recompose');

export function FooterWordmark() {
  return (
    <div className="relative mt-20">
      <svg
        role="img"
        aria-label="recompose"
        viewBox={`0 0 ${WORDMARK.columns * DOT_PITCH} ${9 * DOT_PITCH}`}
        className="w-full"
      >
        {WORDMARK.dots.map((dot) => (
          <circle
            key={`${dot.x}-${dot.y}`}
            cx={dot.x}
            cy={dot.y}
            r={DOT_RADIUS}
            className={dot.tone}
          />
        ))}
      </svg>
      <p
        className="absolute inset-s-0 font-serif text-sm leading-none text-stage-dim"
        style={{ top: '77.8%' }}
      >
        © 2026
      </p>
    </div>
  );
}
