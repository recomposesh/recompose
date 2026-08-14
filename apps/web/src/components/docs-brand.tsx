import type { ComponentProps } from 'react';

export function DocsBrand({ href, className }: ComponentProps<'a'>) {
  return (
    <a href={href} className={`docs-brand ${className ?? ''}`}>
      <img src="/recompose-wordmark.svg" alt="recompose" width={264} height={48} />
    </a>
  );
}
