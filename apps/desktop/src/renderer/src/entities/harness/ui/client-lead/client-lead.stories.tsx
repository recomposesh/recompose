import { expect } from 'storybook/test';

import preview from '#.storybook/preview';

import { ClientLead } from './client-lead';

const meta = preview.meta({
  component: ClientLead,
  args: { lead: { mark: 'claudeCode' as const } },
});

/** A tool that publishes a mark, drawn as that tool draws itself. */
export const OwnMark = meta.story({
  play: async ({ canvasElement }) => {
    const drawn = canvasElement.querySelector('svg');

    await expect(drawn).toHaveAttribute('aria-hidden');
  },
});

/** A tool recompose holds no mark for, which leads with a glyph rather than an invented logo. */
export const HouseGlyph = meta.story({
  args: { lead: { glyph: 'terminal' as const } },
  play: async ({ canvasElement }) => {
    const drawn = canvasElement.querySelector('svg');

    await expect(drawn).toHaveAttribute('viewBox', '0 0 24 24');
  },
});

/** The quiet variant, for a row that names the tool without pulling the eye to its logo. */
export const Mono = meta.story({ args: { variant: 'mono' } });

/** Both kinds of lead in the dark scheme, where a monochrome mark flips with the ink. */
export const DarkScheme = meta.story({
  globals: { theme: 'dark' },
  render: () => (
    <span className="flex gap-3 text-ink">
      <ClientLead lead={{ mark: 'claudeCode' }} />
      <ClientLead lead={{ mark: 'codex' }} />
      <ClientLead lead={{ glyph: 'terminal' }} />
    </span>
  ),
});
