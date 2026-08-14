import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

import SearchDialog from '../components/search';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'recompose' },
      {
        name: 'description',
        content: 'Wire up your own AI network. Compose your AI providers into local gateways.',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://use.typekit.net' },
      { rel: 'preconnect', href: 'https://p.typekit.net', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://use.typekit.net/vva5dyp.css' },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="page">
        <RootProvider search={{ SearchDialog }}>
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
