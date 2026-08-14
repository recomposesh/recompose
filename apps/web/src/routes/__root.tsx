import { Outlet, createRootRoute } from '@tanstack/react-router';

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
      { rel: 'icon', href: '/favicon.png', type: 'image/png' },
      { rel: 'preconnect', href: 'https://use.typekit.net' },
      { rel: 'stylesheet', href: 'https://use.typekit.net/vva5dyp.css' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}
