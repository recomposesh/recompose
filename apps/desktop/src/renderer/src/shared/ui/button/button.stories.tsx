import preview from '#.storybook/preview';

import { Button } from './button';

const meta = preview.meta({
  component: Button,
  args: { children: 'Button', onPress: () => {} },
  decorators: [
    (Story) => (
      <div className="w-72 bg-surface-toolbar p-4">
        <Story />
      </div>
    ),
  ],
});

export const Secondary = meta.story({});
export const Primary = meta.story({ args: { variant: 'primary' } });
export const Danger = meta.story({ args: { variant: 'danger', glyph: 'trash' } });

/** A full-width destructive action with the secondary treatment tinted red. */
export const DangerSecondary = meta.story({
  args: { variant: 'danger-secondary', fullWidth: true, glyph: 'trash' },
});

export const IconSecondary = meta.story({
  args: {
    children: undefined,
    'aria-label': 'Back',
    variant: 'icon-secondary',
    glyph: 'chevron',
    glyphClassName: '-translate-y-px rotate-90',
  },
});
