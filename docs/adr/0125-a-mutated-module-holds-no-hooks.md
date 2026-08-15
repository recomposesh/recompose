# 0125: A mutated module holds no hooks

**Status**: Accepted
**Date**: 2026-08-15

## Context

The mutation gate runs Stryker against `apps/desktop/vitest.mutation.config.ts`. That project sets `environment: 'node'` and excludes `**/*.browser.test.*`, because the browser project starts a chromium per file and a mutation run restarts the runner once per surviving batch.

A renderer module whose only covering tests are browser tests therefore has **zero tests running against it** under Stryker. The gate stays quiet about that. Stryker never mutates a file absent from the `mutate` list in `stryker.config.json`, so the score reads green over code nothing measured.

Six modules under `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-canvas-page/` were in that position, carrying about 1529 lines of decision logic between them. Measured line coverage in the node project was 0% for five of them and 15.58% for the sixth.

Five of the six imported no React at all, which says they were decision functions that never needed a browser. `canvas-standings.ts` was the exception: it mixed four hooks with the decisions those hooks made inline, so nothing could reach those decisions without standing up React.

## Decision

A module named in the `mutate` list holds no React hooks.

Hooks move to a `-hooks.ts` sibling that stays off the list, and the decisions they held inline become named exported functions in the mutated module. The hook keeps the state, the effect registration, and the reads of the live document. The decision keeps the branching.

`canvas-standings.ts` splits this way. `useCanvasStandings`, `usePickerModels`, `useEscapeCancelledDrag`, and `useEscapeSettledCanvas` moved to `canvas-standings-hooks.ts`. What they decided came out beside the types as `standingsOver`, `pendingMovedTo`, `isEscape`, `escapeThrowsTheDragAway`, `escapeSettling`, and `pickedAccountId`.

The reads of the live document stay in the hook and reach the decision as plain facts: `escapeSettling` takes `{ dragging, editing, dialogOpen }` rather than asking the document itself. The hook still checks the key before it reads the document, so a keystroke that means nothing here costs no selector query.

`useGatewayRemoval` leaves `removal-flow.ts` the same way, into `removal-flow-hooks.ts`. What it wrapped stays behind. `forgottenEverywhere` names everything this side drops along with a deleted gateway, and a reader can forget an item off a list that long. That makes it exactly the kind of decision the gate should count. Splitting the hook off it put the decision in reach, and one mutant per dropped thing now has a spec waiting.

The folder already held this shape in `canvas-page-hooks.ts`, so the split names an existing convention rather than inventing one.

## Alternatives

- **Run the hooks in the node project against a React renderer**: rejected. It stands up a React runtime to reach decisions that never needed one, and the mutants it would buy sit in `useState` calls and effect dependency arrays. A mutation score over effect wiring measures nothing a reader would act on.
- **Add the browser project to the mutation run**: rejected. `coverageAnalysis: perTest` needs the runner Stryker drives, and this repository already records that a long chromium run exhausts the browser's memory and dies mid-suite. A mutation run restarts that runner far more often than a test run does.
- **Leave the six off the mutate list**: rejected. That's the defect this record closes. The list read as the set of things measured, while six modules of decision logic sat outside it unmeasured.
- **Put the six on the list and lower the break threshold to absorb the survivors**: rejected outright. A threshold is a gate, and a gate is never loosened to fit the code.
- **Stub a `ReactFlowInstance` so a spec can reach `onInit`**: rejected, and left as a deliberate gap. `onInit` in `canvas-gestures.ts` takes the flow instance and assigns it, and the instance carries about 35 members. The repository bans type assertions, so a node spec needs a full literal stub of some 37 lines. Growing that stub into the shared testkit would hand every later spec a fake to keep in step with the library, and it buys one mutant on one assignment. The line stays uncovered on purpose, and the threshold clears without it.
- **Keep the hooks in the mutated file and accept their survivors**: rejected. Those survivors would stand forever, because no node project can reach them. They teach a reader that some survivors are fine, and they hide the ones that aren't.

## Consequences

**Good**: every decision in the six modules is reachable from a node spec, so the gate measures them. The hooks that remain are thin enough to read at a glance, since each is now state plus one named decision. The rule is mechanical: a file on the mutate list that imports `react` for anything but a type is a file to split.

**Bad**: two files stand where one did, and a reader looking for `useCanvasStandings` finds it next door to the types it returns. Nothing enforces the split, so whoever adds a hook has to remember it. A new hook in a mutated file surfaces only as survivors in the next full run.

The hook bodies themselves stay unmeasured by mutation. Only the browser suite catches a defect in an effect's dependency array, in a listener registration, or in the pairing of `addEventListener` with its cleanup. Those lines carried exactly that much cover before this change, so nothing regressed. This record simply leaves them where they were.
