import { expect, waitFor } from 'storybook/test';

export { tokenChartSeries } from '../ui';

/** Waits for the dashed retention rule to draw, however long the measure takes. */
export async function edgeRuleDrawn(canvasElement: HTMLElement): Promise<void> {
  await waitFor(async () => {
    await expect(canvasElement.querySelector('[stroke-dasharray]')).toBeInTheDocument();
  });
}
