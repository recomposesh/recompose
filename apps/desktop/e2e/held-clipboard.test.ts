import { describe, expect, it } from 'vitest';

import { linesHeld } from './held-clipboard';

const block = [
  'ANTHROPIC_BASE_URL="http://127.0.0.1:8428" \\',
  '  ANTHROPIC_MODEL="fast" \\',
  '  claude',
];

describe('the lines a copied block stands as', () => {
  it('reads a block a machine hands back with line feeds', () => {
    expect(linesHeld(block.join('\n'))).toEqual(block);
  });

  it('reads the same block where the clipboard carries carriage returns', () => {
    expect(linesHeld(block.join('\r\n'))).toEqual(block);
  });

  it('leaves a block of one line as that one line', () => {
    expect(linesHeld('recompose')).toEqual(['recompose']);
  });

  it('answers an empty clipboard with one empty line rather than nothing', () => {
    expect(linesHeld('')).toEqual(['']);
  });
});
