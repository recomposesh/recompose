# 0172: The tool probe asks an interactive login shell

**Status**: Accepted
**Date**: 2026-08-24

## Context

The Add provider screen reported that Claude Code and Codex were both missing on a machine that ran
both. The person's shell resolved `claude` to `~/.local/bin/claude` and `codex` to a folder under
nvm. The app still offered to install what was already there.

A macOS app started from the Finder inherits the environment `launchd` hands it. That environment
carries a `PATH` of four system folders and nothing a person ever configured. The app already asked
the person's shell for the real one, by running `$SHELL -lc env` and reading the `PATH=` line back.

That question was the wrong one. A login shell reads `.zprofile` and `.zlogin`, and only an
interactive shell reads `.zshrc`. Both the Claude Code installer and nvm write their `PATH` line into
`.zshrc`. So the probe answered with a path carrying neither tool, and the screen said what that path
implied.

## Decision

**The probe runs the shell as an interactive login shell.** `-ilc` in place of `-lc` is what makes
the rc file a person actually edits count.

**The environment report arrives between two marks.** An rc file is free to greet, warn, or print a
`PATH=` line of its own before the report, and the reader used to take the first `PATH=` line it
found. The shell prints a delimiter, then `env`, then the delimiter again. Anything outside the pair
is noise.

**Three variables tell the shell not to stall.** A zsh plugin manager stops to offer an update, and
its tmux plugin replaces the shell with a session that reports nothing. Both behaviors would spend
the whole bound. `DISABLE_AUTO_UPDATE`, `ZSH_TMUX_AUTOSTARTED`, and `ZSH_TMUX_AUTOSTART` are what the
ecosystem's own probes set against them.

**The bound rises from three seconds to ten.** An interactive shell runs the whole rc file, which on
a working machine means a version manager, a plugin manager, and a prompt. A bound that runs out
reads on screen as no tool installed, so it sits past a slow start rather than at a fast one.

**The probe holds one reading for ten seconds.** Every surface that reports a tool takes a fresh
reading when it mounts, and each reading used to spawn a shell of its own. The hold stays short
rather than lasting the whole run. Installing a tool is what a person does between two readings, and
an installer is free to leave its binary in a folder no earlier path carried.

## Alternatives

- **The `shell-env` package**: it's the origin of the flags and the marks used here, and it carries
  no bound. An interactive shell waiting for an answer nobody is there to give would hold the main
  process open with no end. This app already refuses that failure elsewhere.
- **Reading the rc files directly**: a `PATH` line can turn on a condition, can come from a version
  manager's own script, and takes a dozen different spellings. Only a shell knows what a shell means.
- **Asking the person to name the folder**: the app knows how to find out, and a machine that already
  runs the tool has nothing left to tell.
- **Holding one reading for the whole run**: a person installs Claude Code because this screen said
  to, and the app would then say again that it's missing. The installer is what creates
  `~/.local/bin` in the first place.

## Consequences

**Good**: the app now finds `claude` and `codex` on any shell a person configured. The probe costs
one shell start for a screen visit rather than one per surface. It answered in under a second for
zsh, fish, and bash on the machine that surfaced this.

**Bad**: an interactive shell runs more of a person's configuration than a login shell does. A slow
rc file makes the reading slower, and a broken one can still spend the bound. The stalling guards
cover the two plugins known to hold a shell open. Any other one falls back to the path the process
already carries, which is the behavior this record replaces rather than one it adds. A shell that
answers to neither `-i` nor `-l`, such as Nushell, exits non-zero and takes that same fallback, so
those machines are no worse off and no better.
