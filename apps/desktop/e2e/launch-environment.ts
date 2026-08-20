import { join } from 'node:path';

/**
 * How long a conversation may rest before the sticky-conversations file expects its branch gone.
 *
 * @summary A pin ages on the engine child's own clock, which nothing outside that process can
 * move, so a scenario proving that an idle conversation is judged again has to shorten the window
 * instead of waiting out the shipped ten minutes. It is long enough that every other scenario in
 * that file takes its second turn well inside it, and short enough that resting past it costs one
 * scenario a few seconds rather than its whole budget.
 */
export const PIN_RESTS_FOR_MS = 6_000;

const STICKY_CONVERSATIONS = join('features', 'routers', 'sticky-conversations');

/**
 * The pin window one spec's app launches under, which is the shipped one unless it ages pins.
 *
 * @summary The file decides rather than a tag, because the scenarios arrive frozen from the change
 * directory and graduation copies them unchanged, so nothing may be written into their text. The
 * serving origin is already chosen the same way, for the same reason.
 */
export function pinWindowFor(specFile: string): Record<string, string> {
  return specFile.includes(STICKY_CONVERSATIONS)
    ? { RECOMPOSE_PIN_IDLE_MS: String(PIN_RESTS_FOR_MS) }
    : {};
}

export function inheritedEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

type ScenarioSeams = {
  tags: string[];
  userDataDir: string;
  probeOrigin: string;
  servingOrigin: string;
  runtimeOrigin: string;
  launchEnv: Record<string, string>;
};

/**
 * The environment one scenario's app launches with.
 *
 * @summary Every seam a scenario can reach lands here once, so the launch reads as one record
 * rather than as spreads scattered through the fixture, and the fixture stays inside its
 * complexity budget.
 */
export function scenarioEnv(seams: ScenarioSeams): Record<string, string> {
  return {
    ...inheritedEnv(),
    NODE_ENV: 'production',
    ELECTRON_RENDERER_URL: '',
    RECOMPOSE_USER_DATA_DIR: seams.userDataDir,
    RECOMPOSE_PROBE_ORIGIN: seams.probeOrigin,
    RECOMPOSE_SERVING_ORIGIN: seams.servingOrigin,
    RECOMPOSE_CONTROL_ORIGIN: seams.probeOrigin,
    ...(seams.tags.includes('@probes-the-minted-address')
      ? {}
      : { RECOMPOSE_RUNTIME_ORIGIN: seams.runtimeOrigin }),
    ...(process.env['CI'] === undefined ? { RECOMPOSE_WINDOW_STAYS_BACK: '1' } : {}),
    ...seams.launchEnv,
  };
}
