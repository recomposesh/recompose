# 0131: Choosing an account moves the tool, never the traffic

**Status**: Accepted
**Date**: 2026-08-16

## Context

A subscription row offered an act called "Use this account," and it wore a badge reading "In use." The code behind the act moved one symlink. That symlink is the `active` pointer for the plan, and it names the config home the plan's own tool runs against. Architecture Decision Record (ADR) 0069 recorded the pointer and asked the interface to say out loud what it does.

The interface said something else. The badge read as "this is the account recompose spends." The helper behind the act claimed to decide whether an account could take over the plan's traffic. Neither claim held. A gateway resolves a route target by the `accountId` written on it, so the canvas decides which account serves. The pointer has never had a say.

Nor should it. A person builds a failover ladder over two accounts of one plan so that both stay bound and both stay reachable in a fixed order. A pointer that overrode the canvas would make the cards on screen lie about what they spend.

So nothing named the pointer's real effect, and nothing showed it. Nothing rendered `shellSetupLine`, the one line that makes the pointer usable. The row offered the act for GitHub Copilot, Kimi, and Antigravity, which have no tool to point anywhere. A person clicked it, a badge moved, and nothing they could observe changed.

## Decision

**A gateway spends the account its canvas names. Choosing an account never moves traffic.** The route target carries an `accountId`, and that's the whole of the resolution.

**Choosing an account moves the config home the plan's own tool runs against, and the row says so in a line a person can copy.** The chosen row carries `Your terminal reaches this account.` above the export line. Only that row carries it, so a person reads which account they chose at a glance rather than from a badge that named no consequence.

**A plan with no tool to point never offers the act, and main refuses it.** The refusal isn't the screen hiding a control. `subscriptions:activate` answers `tool-missing` and names the plan, because a channel that succeeds at nothing is the defect this record closes.

**The badge is no more.** The line under the chosen row marks the account, and a word that says which one without saying what it means is what misled.

## Consequences

**Good**: the act has a visible outcome, and that outcome is the one it truly has. A person holding two Claude accounts sees which one their terminal reaches and copies the line that makes it so. The three plans recompose signs in itself no longer offer a control that couldn't work for them. The canvas stays the single authority on what a gateway spends, so a failover ladder over two accounts of one plan keeps meaning what it draws.

**Bad**: the chosen row stands taller than its siblings, so the list runs uneven wherever a person connected a tool-backed plan. A shell line on an account screen is a technical detail in front of somebody who may never open a terminal. A lapsed account that a person still chose keeps the line, because the pointer still points at it, which sits at odds with the "Signed out" chip.

## Alternatives

**Resolve a subscription target through the plan's active account.** Rejected because it breaks binding two accounts of one plan into one ladder, and the canvas offers that. It would also make a target card name an account it doesn't spend.

**Aim every canvas binding of the plan at the chosen account.** Rejected because rewriting a person's gateways from an account row is a destructive edit made from a screen showing none of what it would change.

**Leave the mechanism and correct only the words.** Rejected because a correct sentence describing an effect nobody can see still leaves the act reading as a no-op. ADR 0069 asked the interface to say the effect out loud, and a line a person can copy is what that looks like.

**Keep the badge beside the line.** Rejected as two signals for one fact. The line already appears on exactly one row, so it marks the chosen account and explains what choosing means in the same breath.
