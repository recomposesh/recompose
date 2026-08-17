import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [fumadocsMdx(), tailwindcss(), tanstackStart(), react(), nitro()],
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    noExternal: ['@lobehub/icons'],
  },
});
