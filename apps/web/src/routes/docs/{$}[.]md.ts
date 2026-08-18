import { createFileRoute } from '@tanstack/react-router';

import { source } from '../../lib/source';

function slugsOf(segments: string[]): string[] {
  const slugs = [...segments];
  const last = slugs.at(-1);

  if (last !== undefined) {
    slugs[slugs.length - 1] = last.replace(/\.md$/, '');
  }

  if (slugs.length === 1 && slugs[0] === 'index') {
    slugs.pop();
  }

  return slugs;
}

function withoutFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n+/, '');
}

export const Route = createFileRoute('/docs/{$}.md')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const page = source.getPage(slugsOf(params._splat?.split('/') ?? []));

        if (!page) return new Response('not found', { status: 404 });

        const [fs, path] = await Promise.all([import('node:fs/promises'), import('node:path')]);
        const markdown = await fs.readFile(
          path.join(process.cwd(), 'content/docs', page.path),
          'utf8',
        );
        const text = `# ${page.data.title}\n\n${withoutFrontmatter(markdown)}`;

        return new Response(text, {
          headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
        });
      },
    },
  },
});
