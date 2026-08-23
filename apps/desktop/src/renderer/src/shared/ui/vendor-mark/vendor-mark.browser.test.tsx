import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { VendorMark } from './vendor-mark';

test('a vendor recompose draws a mark for leads with that mark', async () => {
  const screen = await render(<VendorMark name="anthropic" />);

  expect(screen.container.querySelectorAll('svg')).toHaveLength(1);
  expect(screen.container.querySelector('[data-glyph="spark"]')).toBeNull();
});

test('a vendor with no mark leads with the one stand-in every such row takes', async () => {
  const screen = await render(<VendorMark name={undefined} />);

  expect(screen.container.querySelector('[data-glyph="spark"]')).not.toBeNull();
});

test('the stand-in fills the same square the mark would, so a column of rows stays in line', async () => {
  const marked = await render(<VendorMark className="size-4" name="anthropic" />);
  const bare = await render(<VendorMark className="size-4" name={undefined} />);

  expect(marked.container.firstElementChild?.getAttribute('class')).toContain('size-4');
  expect(bare.container.firstElementChild?.getAttribute('class')).toContain('size-4');
});
