import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

type LayoutOptions = BaseLayoutProps & { nav: NonNullable<BaseLayoutProps['nav']> };

export function baseOptions(): LayoutOptions {
  return {
    nav: {
      title: 'recompose',
    },
  };
}
