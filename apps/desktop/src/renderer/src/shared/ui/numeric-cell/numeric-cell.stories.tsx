import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { NumericCell } from '../index';

const meta = preview.meta({
  component: NumericCell,
  args: { children: '45,123,456' },
  decorators: [
    (Story) => (
      <table>
        <tbody>
          <tr>
            <td className="px-2 py-1">tokens</td>
            <Story />
          </tr>
        </tbody>
      </table>
    ),
  ],
});

/** A figure at the reading's end in tabular digits, so a column of them lines up. */
export const AFigure = meta.story({
  play: async ({ canvas }) => {
    const cell = await canvas.findByText('45,123,456');
    const painted = getComputedStyle(cell);

    await expect(painted.textAlign).toBe('end');
    await expect(painted.fontVariantNumeric).toContain('tabular-nums');
  },
});
