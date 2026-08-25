import type { Decorator } from '@storybook/react-vite';

/** Stands a setup piece on the surface setup itself paints, so a story reads it in context. */
export const onASurface: Decorator = (Story) => (
  <div className="bg-surface-content p-10">
    <Story />
  </div>
);

/** Stands a whole step on a surface tall enough to hold it, the way the wizard does. */
export const onAStepSurface: Decorator = (Story) => (
  <div className="h-250 w-full bg-surface-content">
    <Story />
  </div>
);

/** Stands a row on the card its list is drawn in. */
export const inACard: Decorator = (Story) => (
  <div className="w-160 overflow-hidden rounded-card border border-line-subtle bg-surface-card">
    <Story />
  </div>
);
