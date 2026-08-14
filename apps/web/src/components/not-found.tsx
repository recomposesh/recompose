import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { DefaultNotFound } from 'fumadocs-ui/layouts/home/not-found';

import { gitHubUrl, navOptions } from '../lib/layout.shared';

export function NotFound() {
  return (
    <HomeLayout nav={navOptions} githubUrl={gitHubUrl}>
      <DefaultNotFound />
    </HomeLayout>
  );
}
