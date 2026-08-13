# Fixtures the scenarios need

Today no fixture can plant a credential that existed before recompose ran, and there is no fake `codex` tool. The scenarios in this folder describe the agreed behavior anyway. This file lists what the automation must gain before they run.

## A machine credential planted before launch

`subscription-tools.ts` creates an empty fake keychain, and only the fake `claude` tool writes into it, during a sign-in that recompose starts. Nothing seeds the store before the app launches.

Needed: a fixture that writes a vendor-shaped record into the fake keychain, or into a fake credentials file, before the app starts. It takes the address, the plan, the expiry, and whether the record carries an account credential at all.

Serves: every scenario in `adoption.feature` and the lapse scenarios in `lapsed-remedy.feature`. Also the record-with-no-credential, lapsed, and disagreeing-stores scenarios in `detection.feature`. Also every adopted-account scenario in `renewal.feature`, and the skips-the-first-run-questions and own-login scenarios in `sign-in.feature`.

## A fake `codex` tool

`fake-tools/` holds `claude.mts` and no OpenAI counterpart. Every existing subscription scenario is Anthropic.

Needed: a fake `codex` binary with a config directory it obeys, a key-mode credential file shape, and a keyring-held credential mode.

Serves: the two `openai` scenarios in `detection.feature`.

## Expiry control on the fake credential

The fake `claude` tool writes a credential that carries no expiry.

Needed: planted and written records carry an expiry the scenario chooses, and a scenario can move a credential across its expiry without waiting.

Serves: every scenario in `renewal.feature`, the lapsed scenario in `detection.feature`, and the lapse scenarios in `lapsed-remedy.feature`.

## A renewal mode on the fake `claude` tool

The fake tool only performs a sign-in.

Needed: a renewal entry point that rotates the record in the store without opening a window, and a mode that fails on purpose. The store must show a trace of each renewal, so one renewal under two concurrent requests is provable from the outside. A fresh run of the fake tool must also answer whether it still reads as signed in.

Serves: the delegation, rotation, concurrency, failure, and stays-signed-in scenarios in `renewal.feature`.

## A refusing and a prompting credential store

`fake-tools/keychain.mts` answers find, add, and delete, and always cooperates.

Needed: a mode that refuses to open, the way a locked keychain over a remote session does. Also a mode that surfaces a permission prompt per open, so a second look can prove it asked nothing new.

Serves: the refused-store and second-look scenarios in `detection.feature`.

## First-run questions in the fake `claude` tool

The fake tool signs in without asking anything, even when its config home arrives unseeded.

Needed: the fake tool refuses, or records the questions it would ask, when its home arrives unseeded, so a seeded home is observable as the absence of those questions.

Serves: the skips-the-first-run-questions scenario in `sign-in.feature`.

## A serving turn through a subscription account

The target picker already lists subscription accounts, so the target-parity scenarios stand on existing ground. What the steps lack is a way to route one request, and two at once, through a virtual model whose target is the subscription account under test. The steps must also observe which credential state the serving turn read.

Serves: every request-driven scenario in `renewal.feature`.
