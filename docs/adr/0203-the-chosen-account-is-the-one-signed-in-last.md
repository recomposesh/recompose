# 0203: The chosen account is the one signed in last

**Status**: Accepted
**Date**: 2026-08-26

## Context

Architecture Decision Record (ADR) 0131 kept the act called "Use this account" and gave it a visible outcome. The chosen row carried the sentence `Your terminal reaches this account.` above a copyable export line. Choosing an account finally had something to show for itself.

The maintainer read the act again on 2026-08-26 and reached the verdict ADR 0131 opened with. Pressing it changes nothing a person can observe. The line ADR 0131 added never rescued the act, because that line explains the pointer rather than the press.

Two facts behind the verdict hold up. A gateway spends the account its canvas names, so the pointer moves no traffic, which is ADR 0131's own first decision. On macOS the login keychain holds one Claude Code login per operating-system user. ADR 0069 recorded that as the hole in config-home isolation, so the press moves less on macOS than on Linux or Windows.

## Decision

**The act goes. The pointer stays.**

A subscription row's overflow now holds signing in again and removal, and nothing else. The act never varies with which account a plan's tool runs as, so every row of a plan reads the same list.

`subscriptions:activate` survives in main, along with the park, place, and pointer order ADR 0069 fixed. Two callers still move the pointer. Every sign-in points the plan at the account that just signed in, and removing the pointed-at account hands the pointer to a surviving sibling.

**The chosen account is the one signed in last.** The row keeps `Your terminal reaches this account.` with its copyable line, so which account a terminal reaches stays readable at a glance.

## Consequences

**Good**: no control on the Providers screen promises an outcome a person can't see. The overflow reads one way on every row, so a person never hunts for why one sibling offers an act another withholds.

**Bad**: a person holding two accounts of one plan can no longer pick between them from the screen. Reaching the other one means signing into it again, which the tool does in a terminal the person watches. That cost lands on Linux and Windows, where config-home isolation is whole and the press did move something real. It lands on nobody on macOS, where the shared keychain item already decides the machine-wide login.

## Alternatives

**Keep the act and explain it harder.** Rejected because ADR 0131 already tried that. A second sentence in front of the same press answers a complaint the first sentence failed to answer.

**Remove the pointer along with the act.** Rejected because the pointer aims a plan's own tool at the config home recompose holds for it, which is what ADR 0069 built the custody model around. An account with no config home to run against is an account no tool can sign into.

**Move the choosing to Settings, or to a picker above the list.** Rejected as premature. The complaint names an act that reads as a no-op rather than a screen that went missing. The pointer is still there to move, so a person who wants the choice back can ask for it.
