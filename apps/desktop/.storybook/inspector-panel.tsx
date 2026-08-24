import type { Decorator } from '@storybook/react-vite';

/**
 * Stands a story in the inspector column, at the width and surface the drawer gives it.
 *
 * @summary Reach for it in any story for a section of the router or target inspector, so the
 * heading rhythm and the sentence wrapping are the ones a person actually reads. The width is the
 * drawer's own, and a section that reads well wider than that reads nothing about the panel it
 * ships in.
 */
export const withInspectorPanel: Decorator = (Story) => (
  <div className="mx-auto my-4 w-76 bg-surface-toolbar p-3.5">
    <Story />
  </div>
);
