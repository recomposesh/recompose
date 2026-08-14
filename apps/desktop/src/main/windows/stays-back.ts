/**
 * Whether this run was told to leave the person's screen alone.
 *
 * @summary An acceptance run launches the app dozens of times over. Each launch that comes to the
 * front takes the keyboard off whatever the person was doing, so a run under this marker never
 * shows its window.
 */
export function staysBack(env: NodeJS.ProcessEnv): boolean {
  return env['RECOMPOSE_WINDOW_STAYS_BACK'] === '1';
}

/**
 * What macOS is asked to do with a run that stays back, and nothing for any other run.
 *
 * @summary Holding the window back is not enough on macOS: launching an app makes it frontmost and
 * puts it in the Dock whether or not it shows anything. An accessory has neither, so the run drives
 * its own windows while the person keeps the machine. No other platform answers this, which is why
 * every one of them is asked nothing.
 */
export function activationPolicyFor(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
): 'accessory' | null {
  return platform === 'darwin' && staysBack(env) ? 'accessory' : null;
}
