import { Outlet, createRootRoute } from '@tanstack/react-router';

import { NotFoundScreen } from '../components/not-found-screen';
import { RootDocument } from '../components/root-document';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'recompose' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'preconnect', href: 'https://use.typekit.net' },
      { rel: 'stylesheet', href: 'https://use.typekit.net/vva5dyp.css' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundScreen,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}
