import { defaultSettings } from '@recompose/contracts';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The settings a scenario about anything other than setup starts on.
 *
 * @summary Setup holds the whole window on a profile that has never settled it, so a scenario
 * about the canvas or the menu would be reading an inert tree. Writing the document before the
 * first launch says which profile the scenario is about, and it does it in the app's own shape at
 * its own schema version rather than teaching main a lane only a test uses.
 *
 * A scenario that is about setup opts out with the `@fresh-profile` tag and gets no document, so
 * the app writes its own defaults and the wizard opens the way it does for a person.
 */
export async function settledSetupWritten(userDataDir: string): Promise<void> {
  await writeFile(
    join(userDataDir, 'settings.json'),
    JSON.stringify({ ...defaultSettings(), setupWizardSettled: true }),
    'utf8',
  );
}
