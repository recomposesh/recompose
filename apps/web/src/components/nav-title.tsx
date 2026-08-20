import type { ComponentProps } from 'react';

import { Wordmark } from './wordmark';

export function NavTitle({ href, className }: ComponentProps<'a'>) {
  return (
    <a href={href} className={`${className ?? ''} flex h-7.5 items-center`}>
      <Wordmark height={22} />
    </a>
  );
}
