# 0192: The spell gate reads the whole tree, so it runs on every change

**Status**: Accepted
**Date**: 2026-08-25

## Context

`pnpm run lint:spell` runs `cspell --no-progress "**"`. It reads every file the repository tracks:
TypeScript, CSS, YAML and Markdown alike. It lived as one step inside the `prose` job, and that job
opens only when the diff touches `**/*.md`, `.vale.ini`, `.vale/**` or `mise.toml`.

So a pull request carrying no Markdown never spell-checked the identifiers it added. The words
piled up until some later change touched a Markdown file, and that change wore the failure.

Pull request 326 landed the setup wizard with `lede`, `keyline`, `coprime`, `windowfall`, `nomic`
and `rerank` in it, plus four British spellings in docstrings and one in a CSS comment. None of it
reached a gate. Pull request 329 touched four documentation pages, `prose` opened for the first
time in a while, and the whole backlog failed on `main` rather than on the branch that wrote it.

The pre-commit hook checks staged files alone, and it checks nothing at all from inside a worktree:
`cspell.json` ignores `.claude/worktrees`, and the absolute path of a worktree file matches that
pattern. So the local gate had already handed the same words through.

## Decision

**The spell check is a job of its own, and it always runs.** `spell` carries `pnpm run lint:spell`,
with no `needs` and no filter. Every pull request pays one install and about ten seconds of
cspell, and no diff can add a word without meeting the gate that reads it.

**`prose` keeps what actually reads Markdown.** `lint:openspec` and Vale stay behind the
`prose` filter, because both read `**/*.md` alone and a code-only diff gives them nothing to say.

**`ci-success` waits on `spell`.** The aggregator names every job whose failure has to fail the
run, so a job nothing waits on is a gate in name only.

## Alternatives

- **Widening the `prose` filter to include code**: rejected. It would open Vale and the openspec
  lint on every code diff to reach one step that needed it, and it would hide the real shape: one
  of the three tools reads the whole tree and two read Markdown.
- **Narrowing `lint:spell` to the changed files**: rejected. It would weaken the gate, which the
  project rules forbid outright. A word already in the tree stays checked, which is how a rename
  that reintroduces one gets caught.
- **Leaving the words and adding them to the accept list unread**: rejected. Four of the ten were
  British spellings in a repository set to `"language": "en"`, so they were misspellings rather
  than vocabulary, and the accept list is for words the project actually owns.

## Consequences

**Good**: a word meets the gate in the diff that adds it, on the branch that owns it, rather than
on `main` under whoever next touched a Markdown file. The three prose tools now sit behind filters
that match what each one reads.

**Bad, and accepted**: every pull request pays the install and the cspell run, including one that
edits a single YAML line. The pre-commit hook still checks staged files alone and still checks
nothing from inside a worktree, so continuous integration remains the first honest reading. The
local hook owes its own job.
