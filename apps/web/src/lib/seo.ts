import { siteUrl } from './links';

export interface PageSeo {
  title: string;
  description: string;
  path: string;
}

const socialCard = `${siteUrl}/social-card.png`;

export function pageMeta({ title, description, path }: PageSeo): Record<string, string>[] {
  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'recompose' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: `${siteUrl}${path}` },
    { property: 'og:image', content: socialCard },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'the recompose wordmark' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: socialCard },
  ];
}
