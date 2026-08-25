import type { Decorator } from '@storybook/react-vite';

/** Stands a setup piece on the surface setup itself paints, so a story reads it in context. */
export const onASurface: Decorator = (Story) => (
  <div className="bg-surface-content p-10">
    <Story />
  </div>
);

/**
 * Stands a whole step on the surface the wizard gives it.
 *
 * @summary The height is the app window's own, less the chrome band the surface stops short of. A
 * decorator taller than that would let a step clip its acts in the shipped window while every
 * story still read fine.
 */
export const onAStepSurface: Decorator = (Story) => (
  <div className="h-192 w-full bg-surface-content">
    <Story />
  </div>
);

/** Stands a row on the card its list is drawn in. */
export const inACard: Decorator = (Story) => (
  <div className="w-160 overflow-hidden rounded-card border border-line-subtle bg-surface-card">
    <Story />
  </div>
);
