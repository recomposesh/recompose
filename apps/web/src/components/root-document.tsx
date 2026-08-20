import type * as React from 'react';

import { HeadContent, Scripts } from '@tanstack/react-router';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

import { SearchDialog } from './search-dialog';

export function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ SearchDialog }}>{children}</RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
