import type { Ref } from 'react';

import { Dock } from './dock';
import { MenuBar } from './menu-bar';
import { WindowLayer } from './window-layer';

export function Desktop({ windowLayerRef }: { windowLayerRef: Ref<HTMLDivElement> }) {
  return (
    <div className="relative size-full overflow-hidden font-system">
      <img
        src="/landing/wp-ridges-light.jpg"
        alt=""
        className="absolute inset-0 block size-full object-cover dark:hidden"
      />
      <img
        src="/landing/wp-flow-dark.jpg"
        alt=""
        className="absolute inset-0 hidden size-full object-cover dark:block"
      />
      <div className="absolute inset-0 bg-black/10 dark:bg-black/20" />

      <WindowLayer windowLayerRef={windowLayerRef} />

      <MenuBar />

      <div
        data-diorama-scrim
        className="absolute inset-x-0 bottom-0 h-120 bg-linear-to-b from-transparent via-stage/80 to-stage/95 opacity-0"
      />

      <Dock />
    </div>
  );
}
