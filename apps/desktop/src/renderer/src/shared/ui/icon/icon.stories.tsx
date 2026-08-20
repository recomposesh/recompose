import { expect, within } from 'storybook/test';

import preview from '#.storybook/preview';

import { type IconName, Icon } from '../index';

const sprite: IconName[] = [
  'plus',
  'book',
  'check',
  'chevron',
  'network',
  'spark',
  'person',
  'key',
  'cube',
  'gauge',
  'gear',
  'terminal',
  'brain',
  'branch',
  'renew',
  'stack',
];

const meta = preview.meta({
  component: Icon,
  args: { name: 'plus' },
});

/** A run of the sprite wide enough to read the drawing conventions off. */
export const Sprite = meta.story({
  render: () => (
    <ul className="flex list-none flex-wrap gap-4 p-0">
      {sprite.map((name) => (
        <li className="text-ink" key={name}>
          <Icon name={name} />
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const drawn = canvasElement.querySelectorAll('svg');

    await expect(drawn).toHaveLength(sprite.length);

    for (const glyph of drawn) {
      await expect(glyph.getBoundingClientRect().width).toBe(16);
      await expect(glyph).toHaveAttribute('aria-hidden');
      await expect(glyph.childElementCount).toBeGreaterThan(0);
    }
  },
});

/** The glyph a button carries, which the reference draws a pixel smaller than the standing size. */
export const InAButton = meta.story({
  render: () => (
    <button className="push-button-primary" type="button">
      <Icon className="size-3.75" name="plus" />
      Create Gateway
    </button>
  ),
  play: async ({ canvasElement }) => {
    const pressed = await within(canvasElement).findByRole('button', { name: 'Create Gateway' });
    const glyph = pressed.querySelector('svg');

    await expect(glyph?.getBoundingClientRect().width).toBe(15);
    await expect(getComputedStyle(pressed).columnGap).toBe('6px');
  },
});
