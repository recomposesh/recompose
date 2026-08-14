# Tasks

## 1. The workspace member and its build

- [x] 1.1 Scaffold `apps/web` from the official Fumadocs TanStack Start template, then strip it
      back to house conventions
- [x] 1.2 Point the manifest scripts at the task graph names the desktop manifest already uses
- [x] 1.3 Extend the strict TypeScript base rather than restating its settings
- [x] 1.4 Pin versions that already clear the supply chain window instead of excluding packages
      from it, so no entry weakens that list

## 2. The gate widening

- [x] 2.1 Add the emitted directory to the build outputs in `turbo.json`
- [x] 2.2 Keep every documentation page in `.md`, the format the prose gate already reads,
      because the Vale release that reads `.mdx` natively isn't out
- [x] 2.3 Prove the prose gate reads the documentation by seeding an error and watching it fail
- [x] 2.4 Give `.oxlintrc.json` and `.oxfmtrc.json` the site's stylesheet as a second entry point
- [x] 2.5 Forbid `apps/web` from reaching `apps/desktop` in `.dependency-cruiser.cjs`
- [x] 2.6 Give `knip.json` a workspace block naming the site's entries and its generated route tree
- [x] 2.7 Keep `apps/web` out of the Human Interface Guidelines gate through its config
- [ ] 2.8 Join the site to the continuous integration check job, serialized against rider 118 on
      the CodeQL workflow

## 3. The hero motion module

- [x] 3.1 Specify the aim positions following the head with their own lag
- [x] 3.2 Specify the trail decaying rather than accumulating
- [x] 3.3 Specify the wandering path advancing when no pointer reports
- [x] 3.4 Specify a reduced-motion input stilling the loop while leaving the reveal
- [ ] 3.5 Pair each property law with a deterministic twin, so the mutation gate has a test that
      runs against it

## 4. The hero canvas

- [x] 4.1 Carry the trail and composite programs across, dropping the dead protect path
- [x] 4.2 Mount the canvas and return a disposer that cancels the frame and drops the listener
- [x] 4.3 Stop painting when the hero leaves the viewport
- [x] 4.4 Watch the reduced-motion preference for the life of the page

## 5. The media

- [x] 5.1 Ship the loop and the poster as plain files, leaving the base64 modules behind
- [x] 5.2 Serve the poster as the poster attribute rather than drawing a placeholder
- [x] 5.3 Hold the still frame when the browser refuses playback

## 6. The documentation shell

- [x] 6.1 Wire the content loader to `content/docs`
- [ ] 6.2 Give the documentation its layout, its navigation tree, and its not-found document
- [x] 6.3 Turn on static search: the static handler, the browser-side client, and the search path
      in the prerender list, all three together
- [ ] 6.4 Map the theme variables onto the site's own palette rather than forking the preset

## 7. The build contract

- [x] 7.1 Derive the prerender page list from the content source
- [ ] 7.2 Fail the build on a prerender error rather than emitting a partial site
- [x] 7.3 Assert a document for every published route, including every content page
- [x] 7.4 Assert no server function survives into the emitted directory
- [x] 7.5 Assert the search index is present and answers

## 8. The landing route

- [x] 8.1 Place the hero and the navigation above it
- [x] 8.2 Link to the documentation and to the releases page
- [x] 8.3 Read the brand typeface through the vendor's embed, never from the cached files

## 9. The deployment

- [ ] 9.1 Configure the assets-only Worker with the emitted directory
- [ ] 9.2 Pin not-found handling to the site's own document, never the single-page fallback
- [ ] 9.3 Deploy on a merge

## 10. The record

- [x] 10.1 Write `docs/adr/0104-the-public-site-builds-to-files.md` and add it to the index
- [ ] 10.2 Graduate the scenarios to `apps/web/e2e/features/website/` with the steps that answer
      them, feature and steps in one commit
