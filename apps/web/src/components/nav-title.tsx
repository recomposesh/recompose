import type { ComponentProps } from 'react';

import { Wordmark } from './wordmark';

export function NavTitle({ href, className }: ComponentProps<'a'>) {
  return (
    <a href={href} className={className}>
      <Wordmark height={22} />
    </a>
  );
}
