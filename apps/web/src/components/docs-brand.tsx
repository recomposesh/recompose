import type { ComponentProps } from 'react';

import { Wordmark } from './wordmark';

export function DocsBrand({ href }: ComponentProps<'a'>) {
  return (
    <a href={href}>
      <Wordmark height={22} />
    </a>
  );
}
