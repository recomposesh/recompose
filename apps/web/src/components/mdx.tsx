import type { MDXComponents } from 'mdx/types';
import type { ComponentProps } from 'react';

import { Callout } from 'fumadocs-ui/components/callout';
import defaultMdxComponents from 'fumadocs-ui/mdx';

export function useMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    blockquote: (props: ComponentProps<'blockquote'>) => <Callout>{props.children}</Callout>,
    ...components,
  } satisfies MDXComponents;
}

declare global {
  type MDXProvidedComponents = ReturnType<typeof useMDXComponents>;
}
