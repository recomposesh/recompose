import type { LucideIcon } from 'lucide-react';

import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';
import { BookOpen, Cable, CircleHelp, Download, Rocket, Workflow } from 'lucide-react';
import { createElement } from 'react';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    async: true,
  },
});

const pageIcons: Record<string, LucideIcon> = {
  BookOpen,
  Cable,
  CircleHelp,
  Download,
  Rocket,
  Workflow,
};

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  icon(icon) {
    if (icon === undefined) return undefined;

    const PageIcon = pageIcons[icon];

    return PageIcon ? createElement(PageIcon) : undefined;
  },
});
