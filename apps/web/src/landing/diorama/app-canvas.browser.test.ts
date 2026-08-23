import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { AppCanvas } from './app-canvas';

const roots: Root[] = [];

const mountCanvas = async () => {
  const host = document.createElement('div');

  document.body.append(host);

  const root = createRoot(host);

  roots.push(root);
  root.render(createElement(AppCanvas));

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });

  return host;
};

const titles = (host: HTMLElement) =>
  [...host.querySelectorAll('span')].map((span) => span.textContent);

const cardBearing = (host: HTMLElement, title: string) =>
  [...host.querySelectorAll('div')].filter((card) => card.textContent.includes(title)).at(-1);

afterEach(() => {
  while (roots.length > 0) roots.pop()?.unmount();

  document.body.replaceChildren();
});

describe('the composition the diorama canvas puts on screen', () => {
  it('stands a conditional router beside the round-robin pool', async () => {
    const host = await mountCanvas();

    expect(titles(host)).toContain('conditional');
    expect(titles(host)).toContain('round-robin');
  });

  it('names the model the judge reads each request with', async () => {
    const host = await mountCanvas();

    expect(host.textContent).toContain('Judge');
    expect(titles(host)).toContain('glm-5-air');
  });

  it('gives the judge three targets and the pool two of its own', async () => {
    const host = await mountCanvas();

    expect(titles(host)).toContain('Z.ai');
    expect(titles(host)).toContain('DeepSeek');
    expect(titles(host)).toContain('Kimi');
    expect(titles(host)).toContain('Claude');
    expect(titles(host)).toContain('Codex');
  });

  it('draws deepseek as a key rather than a subscription', async () => {
    const host = await mountCanvas();

    expect(cardBearing(host, 'DeepSeek')?.textContent).toContain('API key');
    expect(cardBearing(host, 'DeepSeek')?.textContent).toContain('deepseek-v4');
    expect(cardBearing(host, 'Kimi')?.textContent).toContain('Subscription');
  });
});
