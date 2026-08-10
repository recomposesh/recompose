import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { subscribeToCanvasAsks } from '../../../../../shared/lib';
import { ToolbarStrip } from './toolbar-strip';

async function renderStrip() {
  return render(
    <ToolbarStrip
      address="http://localhost:51234"
      name="Codex"
      onRun={() => undefined}
      port={51234}
      running={false}
      status="stopped"
    />,
  );
}

test('the tidy control asks the canvas to arrange itself afresh', async () => {
  const asked: string[] = [];
  const letGo = subscribeToCanvasAsks((ask) => {
    asked.push(ask);
  });
  const screen = await renderStrip();

  await screen.getByRole('button', { name: 'Tidy the canvas' }).click();
  letGo();

  expect(asked).toEqual(['tidy']);
});

test('a strip nobody pressed asks the canvas for nothing', async () => {
  const asked: string[] = [];
  const letGo = subscribeToCanvasAsks((ask) => {
    asked.push(ask);
  });

  await renderStrip();
  letGo();

  expect(asked).toEqual([]);
});
