import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { defineConfig, type Plugin } from 'vite';

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

export default defineConfig({
  plugins: [
    docsMarkdownThroughNitroDev(),
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart(),
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
