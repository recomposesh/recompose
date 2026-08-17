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
