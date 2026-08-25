import { beforeEach, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import { canvasPositions } from '../../lib/canvas-position-store';
import { heldDraft } from '../../lib/use-held-draft';
import { draftCardOn, storedBindingOf, storedModels } from '../../testing/canvas-gestures.testkit';
import { canvasPageOn, freshCanvasRun, pickedTheTarget } from '../../testing/canvas-page.testkit';
import { listedModels } from '../../testing/gateway-canvas.testkit';

vi.setConfig({ testTimeout: 40_000 });

beforeEach(freshCanvasRun);

const withClaudeModels = { providerModels: { ...listedModels, s1: ['claude-sonnet-5'] } };

function viewportTransform(container: HTMLElement): string {
  return container.querySelector<HTMLElement>('.react-flow__viewport')?.style.transform ?? '';
}

function targetSeatBesideDraft(seat: { x: number; y: number } | undefined): {
  x: number;
  y: number;
} {
  return { x: (seat?.x ?? 0) + 320, y: seat?.y ?? 0 };
}

async function settledFrames(): Promise<void> {
  await new Promise((settle) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          settle(undefined);
        });
      });
    });
  });
}

test('a draft carrying only an id is asked about by that id, and the confirm lets it go', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Model id' }).fill('steady');

  await userEvent.click(screen.getByRole('button', { name: /Unnamed virtual model/ }));
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText('Delete the virtual model "steady"?')).toBeVisible();

  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Delete' }));

  await expect.poll(() => draftCardOn(screen.container)).toBeNull();
  expect((await storedModels()).length).toBe(2);
});

test('cancelling the ask about a draft keeps every word the person typed', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');

  await userEvent.click(screen.getByRole('button', { name: /Steady/ }));
  await userEvent.keyboard('{Delete}');

  await expect.element(screen.getByText('Delete the virtual model "Steady"?')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  await expect.poll(() => draftCardOn(screen.container)?.textContent).toContain('Steady');
});

test('a target born where the view already reaches leaves the view where it stands', async () => {
  const screen = await canvasPageOn(withClaudeModels);
  const zoomOut = screen.getByRole('button', { name: 'Zoom out' });

  await expect.poll(() => viewportTransform(screen.container)).not.toBe('');

  const opened = viewportTransform(screen.container);

  await userEvent.click(zoomOut);
  await expect.poll(() => viewportTransform(screen.container)).not.toBe(opened);

  const once = viewportTransform(screen.container);

  await userEvent.click(zoomOut);
  await expect.poll(() => viewportTransform(screen.container)).not.toBe(once);

  const resting = viewportTransform(screen.container);

  screen.getByLabelText('Pick a target').first().element().focus();
  await userEvent.keyboard('{Enter}');
  await pickedTheTarget(screen);
  await userEvent.click(screen.getByRole('dialog').getByRole('button', { name: 'Claude' }));
  await userEvent.click(
    screen.getByRole('dialog').getByRole('button', { name: 'claude-sonnet-5' }),
  );

  await expect
    .poll(async () => storedBindingOf('fast'))
    .toEqual({ accountId: 's1', providerModel: 'claude-sonnet-5' });
  await settledFrames();

  expect(viewportTransform(screen.container)).toBe(resting);
});

test('a draft finished in the inspector graduates into the composition and says so', async () => {
  const screen = await canvasPageOn();

  screen.getByLabelText('Add a virtual model').element().focus();
  await userEvent.keyboard('{Enter}');
  await screen.getByRole('textbox', { name: 'Name' }).fill('Steady');
  const draftSeat = heldDraft('my-gateway')?.seat;

  const panel = screen.getByRole('complementary');

  await userEvent.click(panel.getByRole('button', { name: /^Provider One provider/ }));

  await userEvent.click(panel.getByRole('button', { name: /work/ }));
  await userEvent.click(panel.getByRole('button', { name: 'claude-opus-5' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add virtual model' }));

  await expect
    .poll(async () => storedBindingOf('claude-steady'))
    .toEqual({ accountId: 'k1', providerModel: 'claude-opus-5' });
  expect(draftSeat).toBeDefined();
  expect(canvasPositions('my-gateway')).toMatchObject({
    'model:claude-steady': draftSeat,
    'target:claude-steady': targetSeatBesideDraft(draftSeat),
  });
  await expect
    .poll(() => screen.container.querySelector('section > p[aria-live="polite"]')?.textContent)
    .toBe('Bound the virtual model "Steady" to "work".');
  expect(draftCardOn(screen.container)).toBeNull();
});
