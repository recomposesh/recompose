import { z } from 'zod';

/** The file browsers a platform ships, which is the vocabulary every reveal surface conjugates. */
export const fileBrowserSchema = z.enum(['finder', 'explorer', 'file-manager']);

export type FileBrowser = z.infer<typeof fileBrowserSchema>;

const revealLabels: Record<FileBrowser, string> = {
  finder: 'Reveal in Finder',
  explorer: 'Show in Explorer',
  'file-manager': 'Open folder',
};

/**
 * The words a reveal action prints for one file browser.
 *
 * @summary The Help menu and the settings row both print this call, so the byte-identical-label
 * requirement holds through one table rather than a string copied between processes.
 */
export function revealLabelFor(fileBrowser: FileBrowser): string {
  return revealLabels[fileBrowser];
}
