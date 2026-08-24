import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { EmptyState } from './empty-state';

const noop = () => {};

test('the invitation sends a reader to documentation that exists rather than to nothing', async () => {
  const screen = await render(<EmptyState onCreateGateway={noop} shortcutKey="command" />);
  const guide = screen.getByRole('link', { name: 'Read the guide' });

  await expect.element(guide).toHaveAttribute('href', 'https://recompose.sh/docs');
  await expect.element(guide).toHaveAttribute('target', '_blank');
});

test('the invitation names the shortcut under the modifier this machine holds it', async () => {
  const screen = await render(<EmptyState onCreateGateway={noop} shortcutKey="command" />);

  await expect.element(screen.getByText('or press ⌘ N')).toBeVisible();
});

test('a machine holding its shortcuts under Control is told to press Control', async () => {
  const screen = await render(<EmptyState onCreateGateway={noop} shortcutKey="control" />);

  await expect.element(screen.getByText('or press Ctrl N')).toBeVisible();
});
