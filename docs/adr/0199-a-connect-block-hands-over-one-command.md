# 0199: A connect block hands over one command

**Status**: Accepted
**Date**: 2026-08-26

## Context

The connect guide writes each client's setup from the gateway standing in front of the person, and
the copy button puts a whole block on the clipboard at once. Until now every block that pointed a
command-line tool at a gateway opened with a stack of exports:

```sh
export ANTHROPIC_BASE_URL="http://127.0.0.1:8397"
export ANTHROPIC_AUTH_TOKEN="unused"
export ANTHROPIC_MODEL="creative"
export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY="1"
claude
```

An export outlives the command it belongs to. The shell that took that paste points every
later run at this gateway, including runs the person never meant to reconfigure, and the setting
survives until the window closes. Nothing on screen says so, so the cost lands later, on someone
debugging a tool that reads a base URL they no longer remember setting. A gateway on a port that
moved leaves the same shell pointed at a port nothing answers on.

The variables all belong to one process. Claude Code, Codex, the Gemini CLI and the DeepSeek
harness each read them out of their own environment at startup, which a prefix in front of the
command supplies exactly.

## Decision

A block that hands variables to a command puts them in front of it, and the command closes the
block:

```sh
ANTHROPIC_BASE_URL="http://127.0.0.1:8397" \
  ANTHROPIC_AUTH_TOKEN="unused" \
  ANTHROPIC_MODEL="creative" \
  CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY="1" claude
```

`commandCarrying` in `entities/harness/model/connect-facts.ts` builds it. The last variable shares
its line with the command, every earlier line ends in a backslash, and a block carrying one
variable needs no wrapping at all. Values stay quoted, the discovery switch included, so one rule
covers every value rather than a rule and an exception.

The backslash is a readability choice, and it costs nothing in reach. Three shells ran the wrapped
block, and each handed every variable to the command and kept none of them afterward. The three
were bash 3.2.57, zsh 5.9 and fish 4.8.1. Fish is the one worth checking, because the prefix isn't
native fish idiom, and it has accepted `NAME=value command` since 3.1.0.

Every client answered the question on its own:

- **Claude Code**, **Gemini CLI**: the variables configure the session the block starts. They ride
  in front of it.
- **Codex CLI**, **Codex in ChatGPT**: `config.toml` names the variable through `env_key`, but
  Codex reads the value out of its own environment, so the prefix satisfies the file. The desktop
  client shares the block, and loses nothing: an app launched from Finder inherits neither an
  export nor a prefix.
- **DeepSeek Harness**: `settings.yaml` names the variable through `apiKeyEnv`, and the web harness
  is the process that reads it. The block that used to export the key now starts the harness again
  with the key in front, the only form that reaches the process the file names.
- **Kimi Code**, **opencode**, **pi**, **omp**, **Cursor**, **Cline**, **Roo Code**, **Kilo Code**,
  **Claude Desktop**, **curl**: no variable ever reached a shell here. Their keys sit in a
  configuration file or a form, and their blocks stand as they were.

The `~/.claude/settings.json` alternative stands as it was. That block writes a file rather than a
shell, background agents read it, and it carries the same variables as the command beside it.

## Alternatives

- **One long unbroken line**: rejected. It pastes and runs identically, and it reads as a wall. The
  continuation was only worth avoiding if a shell choked on it, and none of the three does.
- **Keeping the exports and adding a sentence warning about them**: rejected. A note that asks a
  person to undo what the block just did is a defect described rather than fixed.
- **`env NAME=value command`**: rejected. It reaches the same result through a binary the reader
  then has to learn, and the prefix is what every one of these tools' own documentation shows.
- **Leaving the DeepSeek key as a bare export because its block has no command of its own**:
  rejected. The variable feeds the harness process, and the harness has a launch line one step
  above. Starting it again with the key in front says what has to happen, where an export left the
  person to work out that the running harness never saw it.

## Consequences

**Good**: a copied block reaches one process and leaves the shell as it found it, so a person can
try a gateway without their terminal remembering it. Every block is now a single runnable command,
which is what the copy button always implied. `exportLine` leaves the codebase with no caller, so
there is no second form to keep in step.

**Cost**: the wrapped block is four lines where a reader might expect one. A person who wanted the
old behavior, a shell pointed at the gateway for the whole session, now types the exports
themselves or uses the settings file. The published connect pages under
`apps/web/content/docs/connect/` still print the export form and have to follow.
