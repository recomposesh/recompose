import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { NumericCell, TableShell } from '../index';

const meta = preview.meta({
  component: TableShell,
  args: {
    caption: 'Requests and tokens by gateway',
    children: (
      <>
        <thead>
          <tr>
            <th className="px-2 py-1 text-start font-medium text-ink-secondary">Gateway</th>
            <th className="px-2 py-1 text-end font-medium text-ink-secondary">Requests</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="px-2 py-1">relay</td>
            <NumericCell>4,212</NumericCell>
          </tr>
        </tbody>
      </>
    ),
  },
});

/** A data table inside its own scrolling shell, so a wide reading never scrolls the page. */
export const Readings = meta.story({
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Requests and tokens by gateway' });

    await expect(table).toBeVisible();

    const numeric = await canvas.findByText('4,212');

    await expect(getComputedStyle(numeric).textAlign).toBe('end');
  },
});
