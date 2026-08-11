import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { NavGroup } from './nav-group';

const meta = preview.meta({
  component: NavGroup,
  args: {
    title: 'Local Gateways',
    children: (
      <>
        <a className="nav-item" href="#relay">
          relay
        </a>
        <a className="nav-item" href="#personal">
          personal
        </a>
      </>
    ),
  },
});

/** The group stands under its heading, labelled as one landmark for assistive tech. */
export const Basic = meta.story({
  play: async ({ canvas }) => {
    const group = await canvas.findByRole('group', { name: 'Local Gateways' });

    await expect(group).toBeVisible();
    await expect(await canvas.findByText('relay')).toBeVisible();
  },
});

/** The same group in the dark scheme, where the heading ink has to hold against the sidebar. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
});
