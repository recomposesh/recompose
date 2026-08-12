import type { ReactNode } from 'react';

import { Collapsible } from '@base-ui/react/collapsible';

type DisclosureProps = {
  /** What the trigger offers to reveal. */
  label: string;
  /** The reading the panel holds once opened. */
  children: ReactNode;
  /** Whether the panel starts open. */
  defaultOpen?: boolean;
  /** The panel's standing when something outside owns it, like a menu tick. */
  open?: boolean | undefined;
  /** Receives the standing the trigger asks for. */
  onOpenChange?: ((open: boolean) => void) | undefined;
};

/**
 * A reading folded away behind its own trigger, opened when a person asks.
 *
 * @summary Reach for it where a page keeps a secondary form of something already painted, like
 * the data-table twin under a chart. The trigger announces its expanded state, and the panel
 * leaves the tree when shut so assistive tech never wades through a reading nobody asked for.
 */
export function Disclosure({
  label,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
}: DisclosureProps) {
  return (
    <Collapsible.Root defaultOpen={defaultOpen} onOpenChange={onOpenChange} open={open}>
      <Collapsible.Trigger className="flex h-6 items-center gap-1 rounded-control focus-ring px-1 text-detail text-ink-secondary row-hover">
        <svg
          aria-hidden
          className="size-2.5 transition-transform in-data-panel-open:rotate-90"
          fill="currentColor"
          viewBox="0 0 10 10"
        >
          <path d="M3 1.5 7.5 5 3 8.5Z" />
        </svg>
        {label}
      </Collapsible.Trigger>
      <Collapsible.Panel className="pt-2">{children}</Collapsible.Panel>
    </Collapsible.Root>
  );
}
