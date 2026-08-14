import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { appName, gitConfig } from './shared';

export const navOptions: NonNullable<BaseLayoutProps['nav']> = {
  title: appName,
};

export const gitHubUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;
