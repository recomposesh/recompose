import type { MDXComponents } from 'mdx/types';

import defaultMdxComponents from 'fumadocs-ui/mdx';

export function useMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...components,
  } satisfies MDXComponents;
}

declare global {
  type MDXProvidedComponents = ReturnType<typeof useMDXComponents>;
}
