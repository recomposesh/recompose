# 0128: A gate reads the text that lands

**Status**: Accepted
**Date**: 2026-08-15

## Context

The `pre-commit` hook in `lefthook.yml` held two jobs that rewrite a staged file. `lint` ran `oxlint --fix` with `stage_fixed: true`, and `fmt` ran `oxfmt` with `stage_fixed: true`. The `lint` job sat above `fmt` in the jobs array, so the linter read the file as the author typed it, and the formatter then rewrote that file and staged the rewrite.

Nothing read the rewrite. The commit carried text that no gate had seen.

That gap has a shape: any rule whose verdict depends on the layout of the text. `max-lines-per-function` caps a function at 50 lines, and `max-lines` caps a file at 300. A one-line object literal wider than the print width becomes six lines under `oxfmt`. Two of them add ten lines to a function the linter already approved.

Pull request #233 paid for this. Two object literals written as one line each expanded to six lines apiece, a 45-line function became 55, and `max-lines-per-function` failed on CI. The author's scoped lint run was honest, and so was the hook. Both read the 45-line version. Neither read the 55-line version that landed.

The ordering mechanism turned out not to be the one the file advertised. Every job carried a `priority` key, and the `priority` documentation for lefthook 2.1.10 describes a sort where lower numbers run first and `0` runs last. That option belongs to the legacy `commands:` and `scripts:` maps, which hold no order of their own and so need a sort key. It doesn't reach the `jobs:` array. The `Job` struct in `internal/config/job.go` at tag v2.1.10 carries no `Priority` field at all. `Command` in `command.go` and `Script` in `script.go` each carry both the field and the comparator that honors it.

A probe against the pinned binary confirms the split. Under `jobs:`, a job with `priority: 9` listed first runs before a job with `priority: 1` listed second, under both `parallel: false` and `piped: true`. Under `commands:`, the same pair runs in priority order. So the array order was the entire mechanism, and thirteen `priority` keys described a sort that never ran.

## Decision

The jobs that rewrite a staged file run before every job that reads one.

`fmt` moves to the top of the content jobs, and `lint` follows it. Both writers finish before `gitleaks`, `boundaries`, `fsd`, `dead`, `hig`, `dup`, `spell`, `prose`, `openspec`, and `typecheck` begin. `protect-main` keeps its place at the head, because it tests the branch name rather than the content.

The `priority` keys come out. Keeping them would have put `priority: 2` above `priority: 1` in the array. That reads as a defect to anyone who trusts the numbers, and it invites a later reader to restore the order that caused this record. The array order is the mechanism, so the array order is what the file states.

A comment at the head of the file records two facts the configuration can't express. Order comes from the array, and the writers precede the readers.

## Alternatives

- **Move `lint` below `fmt` and leave the rest alone**: rejected. It fixes one reader. `gitleaks` scans the staged blob, `dup` measures duplication, `prose` runs Vale over markdown that `oxfmt` also reformats, and `spell` reads the working tree. Each of them shared the defect, and each would have kept it. Lifting the single writer above all closes the class in one move.
- **Drop `--fix` from `lint` so the formatter is the only writer**: rejected as out of scope and worse ergonomics. The maintainer authorized an ordering change. Removing the autofix would make the gate stricter, not weaker, but it hands work back to the author that a tool already does correctly.
- **Run `fmt` a second time after `lint`**: rejected for now. It would pin the last writer's output to a formatted fixed point, but it also re-opens the original direction, because that second format pass would itself go unread. The pair reaches a fixed point in one pass today, and the check below proves it.
- **Lower or relax a size rule so formatter growth fits**: rejected outright. A gate is never loosened to fit the code.
- **Leave the `priority` keys as documentation of intent**: rejected. They state a mechanism the pinned version doesn't run.

## Consequences

**Good**: the linter reads the exact bytes the commit carries, so a formatter-driven size violation fails locally instead of on CI. Every whole-repo check now runs after the text settles. The failure that #233 paid for is reproducible on demand and now blocks.

**Bad**: `lint` is the last writer, and nothing re-formats its autofix output before it lands. A lint autofix that leaves unformatted text would reach CI and fail `fmt:check` there. Measurement today says it doesn't. A file needing both a quote change from `oxfmt` and a blank line from `@stylistic/padding-line-between-statements` came out of the hook with both edits staged, and `oxfmt --check` passed on the result. That's a property of the current rule set rather than a guarantee, and a new autofixing rule can break it.

**Also bad**: the hook now formats before it checks for secrets. `gitleaks` reads the formatted blob, which is the blob that lands, so the scan is honest about what the commit contains. A secret that only a formatter's reflow could hide would have escaped CI too, so the scan gains accuracy rather than losing it.

The `priority` keys are unavailable as an ordering tool for as long as this repository uses the `jobs:` array. Anyone reaching for one is reaching for a key that lefthook drops on the floor.
