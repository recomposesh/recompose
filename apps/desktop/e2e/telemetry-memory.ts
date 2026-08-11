import type { Page } from '@playwright/test';

import { recalled } from './canvas-memory';

const footerReadings = new WeakMap<Page, string>();

const wholeStreams = new WeakMap<Page, number>();

const draggedHeights = new WeakMap<Page, number>();

const cursorsHeld = new WeakMap<Page, string>();

export function rememberFooterReading(page: Page, reading: string): void {
  footerReadings.set(page, reading);
}

/** What the strip read before the drawer went up, which a closed drawer must read again. */
export function footerReadingBefore(page: Page): string {
  return recalled(footerReadings, page, 'no step read the footer this scenario expects to return');
}

export function rememberWholeStream(page: Page, rows: number): void {
  wholeStreams.set(page, rows);
}

/** How many rows stood before a scope narrowed them, which is what narrowing is read against. */
export function wholeStreamBefore(page: Page): number {
  return recalled(wholeStreams, page, 'no step read the whole stream this scenario narrows');
}

export function rememberDraggedHeight(page: Page, height: number): void {
  draggedHeights.set(page, height);
}

/** How tall the drawer stood after a drag, which reopening it has to stand at again. */
export function draggedHeightBefore(page: Page): number {
  return recalled(draggedHeights, page, 'no step in this scenario dragged the drawer taller');
}

export function rememberCursorRow(page: Page, row: string): void {
  cursorsHeld.set(page, row);
}

/** Which row the cursor stood on, so a copy can be read against the row it was taken from. */
export function cursorRowBefore(page: Page): string {
  return recalled(cursorsHeld, page, 'no step in this scenario put the cursor on a row');
}
