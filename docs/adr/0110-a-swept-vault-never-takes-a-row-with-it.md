# 0110: A swept vault never takes a row with it

**Status**: Accepted
**Date**: 2026-08-14

## Context

`vault.bin` and `accounts.json` are separate files, and the one process that writes either writes them one after the other. Architecture Decision Record (ADR) 0018 took that bounded window rather than paying for a transaction across both files. It named the two states a failure between the writes leaves behind:

- a vault entry no account references, which stays encrypted and out of reach
- an account whose `credentialRef` names an entry that isn't there

#39 asked for the repair that record deferred. It left the second case open, asking for a policy that "must preserve clear user recovery semantics."

## Decision

The repair runs once at boot, the only moment nothing else writes either file. It treats the two states differently, because they aren't alike.

**An orphaned vault entry goes.** Nothing knows its ref and the value stays encrypted, so nobody can ever open it again. Dropping it costs nothing anyone could recover, and keeping it grows a file of secrets nobody can spend.

**An account whose credential vanished keeps its place, and the repair names it.** The row still carries what a person chose: its name, its endpoint, the provider it points at. Dropping it would destroy all that to repair a missing secret they can paste back in a moment. Naming it costs nothing and leaves the row where they can find it.

The repair writes only when it swept something, so an ordinary boot reads two files and touches neither.

## Alternatives

- **Dropping the unusable account row**: rejected. It trades a recoverable state for one nobody can undo. A person would rebuild a row they had already set up, to fix a key they still hold.
- **Moving the row into a quarantine file**: rejected. It hides a row from the screen it belongs on, and somebody then has to teach the person that the file exists.
- **Running the repair on every write**: rejected. Every write would read both files to check the other, and this window opens only when a write fails.
- **One transaction across both files**: rejected again, for the same reason that record gave. This repair is what makes the window affordable.

## Consequences

**Good**: the divergence that window opens heals itself on the next start, in the one direction that loses nothing. The reconciliation is a pure function over two documents, so its specs never touch a disk.

**Bad**: a dangling account still fails at serve time, and the screen says nothing about it. Naming it in the log is the smallest honest step rather than the whole of one. Marking the row wants a field on the account schema and a migration, which is its own job.

Two accounts sharing one `credentialRef` both keep it. The repair drops an entry only when no account reaches it.
