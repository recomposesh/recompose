import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { cardOnCanvas } from '../../testing/canvas-flow.testkit';
import { DraftModelNode } from './draft-model-node';

async function renderDraft(began: { modelId: string; displayName: string }) {
  return render(
    cardOnCanvas(
      'draft-model',
      DraftModelNode,
      { id: 'draft', kind: 'draft-model', ...began, onPickTarget: vi.fn<() => void>() },
      false,
    ),
  );
}

test('a draft nobody has typed into still names itself rather than standing blank', async () => {
  const screen = await renderDraft({ modelId: '', displayName: '' });

  await expect
    .element(screen.getByRole('button', { name: /Unnamed virtual model/ }))
    .toHaveTextContent('no id yet');
});

test('a draft that carries what a person typed reads it back rather than a placeholder', async () => {
  const screen = await renderDraft({ modelId: 'fast-haiku', displayName: 'Fast Haiku' });

  await expect
    .element(screen.getByRole('button', { name: /Fast Haiku/ }))
    .toHaveTextContent('fast-haiku');
});
