# 0101: recompose runs Copilot's device flow itself

**Status**: Accepted
**Date**: 2026-08-13

## Context

Record 0100 placed four of the five awaited plans. GitHub Copilot is the fifth, and it's the one plan where nothing on the machine owns the sign-in.

Every subscription recompose connects today delegates. Claude Code owns Anthropic's flow, Codex owns OpenAI's, and CLIProxyAPI owns Gemini's and Kimi's. The provider table therefore describes a tool: a binary, a config home variable, and the arguments that start a sign-in. Record 0080 and the subscriptions spec both rest on that delegation.

No tool ships Copilot's. CLIProxyAPI has no flag for it. `gh` authenticates a person to GitHub but mints no Copilot credential. CC Switch implements the flow itself, in `src-tauri/src/proxy/providers/copilot_auth.rs`, and every other shipped Copilot bridge does the same.

GitHub's flow also has a shape the others don't. The credential a person's authorization yields is long-lived, and it's not the credential a turn carries. recompose buys that one from `copilot_internal/v2/token`, reads its expiry, and buys another before it lapses.

## Decision

**recompose runs the device authorization itself, and only for this plan.** The flow follows CC Switch's shipped implementation rather than a reading of the endpoints. It carries Visual Studio Code's client identity and asks a device code. It then polls at the interval the server names, waits longer when it answers `slow_down`, and stops on a refusal it calls terminal.

**The provider table splits rather than growing a hole.** `subscriptionProviders` keys on the plans a tool signs into. Copilot stands outside it, so the compiler asks every tool-delegating path what it does about the one plan with no tool. Four paths answer for themselves: tool presence, the sign-in command, the config home, and the delegated renewal.

**The handle that completes the flow never leaves the main process.** The screen receives the code a person types and the address they type it at. The device code stays in main, so nothing outside this process can finish a sign-in it didn't open.

**The vault holds the long-lived credential, and the grant path buys the short-lived one.** Each account keeps its bought credential until a minute before it lapses. Buying per turn would ask GitHub on every call, and letting one lapse mid-turn fails a request a person is watching. The margin is CC Switch's, for that reason.

## Alternatives

- **Waiting for CLIProxyAPI to add a Copilot flag**: rejected. It leaves one row inert on a schedule nobody here controls, and that promise is the badge this work removes.
- **Asking a person to paste a GitHub token**: rejected. It works, and it asks somebody to mint a classic token with the right scopes by hand, which is the onboarding record 0080's own context calls a cost worth removing.
- **Storing the short-lived credential instead**: rejected. It expires within the hour, so every session would start lapsed.
- **Buying the short-lived credential inside the engine child**: rejected. The child holds no vault and no account identity, so the trade would need both crossing the wall.
- **Passing the device code to the renderer and polling there**: rejected. A handle that completes an authorization is credential-shaped, and the renderer is the one process that never holds those.

## Consequences

**Good**: every row in every catalog now connects, and the Soon badge leaves the product. The tool table describes only plans that have tools, so a future plan with no tool meets a compiler error rather than a runtime hole.

**Bad**: recompose now owns an authorization flow it has to maintain, against endpoints GitHub documents nowhere. `copilot_internal` says as much in its name. The client identity is Visual Studio Code's, which is what every shipped bridge uses and what GitHub could revoke. The bought credential lives in memory only, so a restart re-buys it, and nothing yet reports a Copilot account whose long-lived credential the vendor revoked.
