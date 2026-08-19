import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { RouterModes } from './router-modes';

const roots: Root[] = [];

const mountModes = async () => {
  const host = document.createElement('div');

  document.body.append(host);

  const root = createRoot(host);

  roots.push(root);
  root.render(createElement(RouterModes));

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });

  return host;
};

afterEach(() => {
  while (roots.length > 0) roots.pop()?.unmount();

  document.body.replaceChildren();
});

describe('the routing modes the landing offers a visitor', () => {
  it('offers conditional beside failover and round-robin', async () => {
    const host = await mountModes();

    const offered = [...host.querySelectorAll('span')].map((span) => span.textContent);

    expect(offered).toContain('failover');
    expect(offered).toContain('round-robin');
    expect(offered).toContain('conditional');
  });

  it('sells conditional as a judge picking the model that answers', async () => {
    const host = await mountModes();

    expect(host.textContent).toContain(
      'the right model for each request. a judge reads it and picks who answers.',
    );
  });
});
