import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { NavTitle } from '../components/nav-title';

type LayoutOptions = BaseLayoutProps & { nav: NonNullable<BaseLayoutProps['nav']> };

export function baseOptions(): LayoutOptions {
  return {
    nav: {
      title: NavTitle,
    },
  };
}
