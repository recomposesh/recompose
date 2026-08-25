import type { Decorator } from '@storybook/react-vite';

/** Stands a setup piece on the surface setup itself paints, so a story reads it in context. */
export const onASurface: Decorator = (Story) => (
  <div className="bg-surface-content p-10">
    <Story />
  </div>
);
