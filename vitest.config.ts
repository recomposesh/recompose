/**
 * @summary There is no root test project on purpose. Without this file Vitest falls back to its
 * default config and collects every test in the repository into one node project, which runs the
 * browser suites in node and forks one worker per core. A root `projects` list is not the fix
 * either: Vitest 4 collapses a referenced config's own `projects` into a single project, so
 * `apps/desktop/vitest.config.ts` would lose its browser and storybook projects the same way.
 */
export default () => {
  throw new Error(
    [
      'recompose has no root test project. Run tests per package instead:',
      '  pnpm test                                                              (every package)',
      '  pnpm --filter @recompose/engine exec vitest run                        (one package)',
      '  pnpm --filter @recompose/desktop exec vitest run --project unit        (one project)',
    ].join('\n'),
  );
};
