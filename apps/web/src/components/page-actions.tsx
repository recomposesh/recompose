import { MarkdownCopyButton, ViewOptionsPopover } from 'fumadocs-ui/layouts/docs/page';

const CONTENT_REPO_URL = 'https://github.com/recomposesh/recompose/blob/main/apps/web/content/docs';

function markdownUrlOf(url: string) {
  return url === '/docs' ? '/docs/index.md' : `${url}.md`;
}

export function PageActions({ path, url }: { path: string; url: string }) {
  return (
    <div className="not-prose flex flex-row items-center gap-2 border-b pt-2 pb-6">
      <MarkdownCopyButton markdownUrl={markdownUrlOf(url)} />
      <ViewOptionsPopover
        markdownUrl={markdownUrlOf(url)}
        githubUrl={`${CONTENT_REPO_URL}/${path}`}
      />
    </div>
  );
}
