import { expect, waitFor } from 'storybook/test';

import type { ChartBar } from '../ui';

export { tokenChartSeries } from '../ui';

/** Waits for the dashed retention rule to draw, however long the measure takes. */
export async function edgeRuleDrawn(canvasElement: HTMLElement): Promise<void> {
  await waitFor(async () => {
    await expect(canvasElement.querySelector('[stroke-dasharray]')).toBeInTheDocument();
  });
}

/** A day of hour buckets whose values vary enough to read as a real chart. */
export function hourChartBars(hours: number): readonly ChartBar[] {
  return Array.from({ length: hours }, (_, hour) => ({
    at: hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    values: {
      input: 200 + ((hour * 37) % 400),
      cached: 80 + ((hour * 23) % 200),
      output: 60 + ((hour * 11) % 100),
    },
  }));
}
