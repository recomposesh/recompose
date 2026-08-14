import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { Wordmark } from '../components/wordmark';

type LayoutOptions = BaseLayoutProps & { nav: NonNullable<BaseLayoutProps['nav']> };

export function baseOptions(): LayoutOptions {
  return {
    nav: {
      title: <Wordmark height={18} />,
    },
  };
}
