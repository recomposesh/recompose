import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { NavTitle } from '../components/nav-title';
import { gitHubUrl } from './links';

type LayoutOptions = BaseLayoutProps & {
  nav: NonNullable<BaseLayoutProps['nav']>;
  githubUrl: string;
};

export function baseOptions(): LayoutOptions {
  return {
    nav: {
      title: NavTitle,
    },
    githubUrl: gitHubUrl,
  };
}
