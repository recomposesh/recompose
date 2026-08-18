import { describe, expect, it } from 'vitest';

import { pageMeta } from './seo';

describe('every page describes itself to crawlers the same way', () => {
  const meta = pageMeta({
    title: 'download recompose',
    description: 'one installer per platform.',
    path: '/download',
  });

  it('leads with the title and carries the description', () => {
    expect(meta[0]).toStrictEqual({ title: 'download recompose' });
    expect(meta).toContainEqual({ name: 'description', content: 'one installer per platform.' });
  });

  it('hands Open Graph the absolute address and the shared card', () => {
    expect(meta).toContainEqual({ property: 'og:url', content: 'https://recompose.sh/download' });
    expect(meta).toContainEqual({
      property: 'og:image',
      content: 'https://recompose.sh/social-card.png',
    });
    expect(meta).toContainEqual({ property: 'og:title', content: 'download recompose' });
    expect(meta).toContainEqual({ property: 'og:site_name', content: 'recompose' });
    expect(meta).toContainEqual({ property: 'og:type', content: 'website' });
  });

  it('asks for the large card on Twitter', () => {
    expect(meta).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' });
    expect(meta).toContainEqual({
      name: 'twitter:image',
      content: 'https://recompose.sh/social-card.png',
    });
    expect(meta).toContainEqual({ name: 'twitter:title', content: 'download recompose' });
  });
});
