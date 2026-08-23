import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { createLogger, defineConfig, type Plugin } from 'vite';

import {
  changelogVersionPaths,
  docsMarkdownPaths,
  docsPagePaths,
} from './scripts/published-paths.mts';

function docsMarkdownThroughNitroDev(): Plugin {
  return {
    name: 'docs-markdown-through-nitro-dev',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        // Nitro's dev middleware lists md in ASSET_EXT_RE and answers those requests from static
        // files, so the /docs/{$}.md route only hears requests that declare a document destination.
        const url = request.url ?? '';

        if (url.startsWith('/docs/') && /\.md(?:[?#]|$)/.test(url)) {
          request.headers['sec-fetch-dest'] = 'document';
        }

        next();
      });
    },
  };
}

/**
 * A logger that drops one dependency's sourcemap warning and keeps every other one.
 *
 * @summary zbsearch publishes sourcemaps naming a `src` tree it never publishes, so every server
 * render prints one warning per file the search client touches. Pre-bundling it through
 * `optimizeDeps.include` on the client environment and on the ssr one, and externalizing it, all
 * leave the nitro environment reading those maps, so the message goes by name. Naming zbsearch
 * rather than the whole message keeps a broken sourcemap in our own code visible.
 */
function loggerWithoutZbsearchSourcemapNoise() {
  const logger = createLogger();
  const warnOnce = logger.warnOnce.bind(logger);

  logger.warnOnce = (message, options) => {
    if (message.includes('zbsearch') && message.includes('points to missing source files')) return;

    warnOnce(message, options);
  };

  return logger;
}

export default defineConfig({
  customLogger: loggerWithoutZbsearchSourcemapNoise(),
  plugins: [
    docsMarkdownThroughNitroDev(),
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
        filter: ({ path }) => !path.startsWith('/download/'),
      },
      pages: [
        ...[
          ...docsPagePaths(import.meta.dirname),
          ...docsMarkdownPaths(import.meta.dirname),
          ...changelogVersionPaths(import.meta.dirname),
          '/api/search',
          '/changelog.xml',
        ].map((path) => ({ path })),
        { path: '/404', prerender: { enabled: true, outputPath: '/404.html' } },
      ],
    }),
    react(),
    nitro(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ['@lobehub/icons'],
  },
});
