# Research brief: adopt machine subscriptions

## Verdict on the refresh race

Both providers rotate the refresh token and invalidate the previous one. Adoption by copy logs the person out of their own command-line tool, on both sides. This is the most reported failure mode in the area, not a theoretical risk.

**Anthropic rotates, single use, no documented grace window.** [claude-code#24317](https://github.com/anthropics/claude-code/issues/24317) describes the mechanism: process A refreshes, receives a new access token and a new refresh token, writes to the store; process B, still holding the old refresh token, is rejected because that token was already spent, and falls back to the browser. [claude-code#56339](https://github.com/anthropics/claude-code/issues/56339) repeats it for two command-line sessions sharing one credentials file with no locking.

The decisive evidence is a shipped product that did what this change proposes. [CodexBar#1161](https://github.com/steipete/CodexBar/issues/1161) reports that refreshing the Anthropic token directly rather than delegating to the command-line tool forces `claude /login` roughly once a day, because Anthropic rotates on every refresh and CodexBar kept the new token to itself. The issue's own remedy is to delegate refresh whenever the command-line tool is present and to make self-owned refresh an explicit opt-in. Read it as a post-mortem of the copy design. [opencode-claude-auth](https://github.com/griffinmartin/opencode-claude-auth) states the same rule from the other direction: refresh tokens rotate on each use, so write-back is on by default.

**OpenAI rotates, single use, with a named error for reuse.** The backend answers a spent refresh token with HTTP 401 and `refresh_token_reused` ([codex#19803](https://github.com/openai/codex/issues/19803)), and the same error drives [codex#9634](https://github.com/openai/codex/issues/9634), [codex#15754](https://github.com/openai/codex/issues/15754), [codex#17340](https://github.com/openai/codex/issues/17340), and the concurrency race in [codex#10332](https://github.com/openai/codex/issues/10332). Recovery in every report is manual: delete the file and sign in again.

OpenAI documents the prohibition itself. The Codex continuous-integration guide says not to share one credential file across concurrent jobs or machines, and names "another machine or concurrent job rotated the token first" as a cause ([learn.chatgpt.com/docs/auth/ci-cd-auth](https://learn.chatgpt.com/docs/auth/ci-cd-auth)). The vendor states in writing that the copy design fails.

**The Codex staleness timer makes it a schedule, not a race.** Codex refreshes when the access token has expired or when `last_refresh` is older than roughly eight days, then writes the new bundle back. A recompose copy that never refreshes on its own still triggers a rotation about every eight days of use, and the person's own Codex is signed out on that cadence.

**Token lifetimes are not publishable.** Anthropic access-token lifetime is reported as eight hours in [#60503](https://github.com/anthropics/claude-code/issues/60503) and as roughly fifteen in [#24317](https://github.com/anthropics/claude-code/issues/24317). The sources disagree, so read `expiresAt` from the blob rather than assuming a value. Claude Code 2.1.203 and later warns that a login expires in three days, so the refresh chain has a finite life of its own.

## Credential handling options

| Option                                      | How it works                                                                                                                         | What breaks                                                                                                                                                                           | Verdict                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Copy the blob once                          | Read the store at adoption, keep a copy, refresh independently                                                                       | Signs the person out of their own tool every day to every week. For Codex the eight-day timer forces it even under light use, and OpenAI's documentation forbids the pattern outright | Reject                                             |
| Read through, write back                    | Re-read the live store on cache miss; when a refresh is unavoidable, perform it and write the rotated pair back so one owner remains | Torn reads when the vendor writes without atomic replace; still races if both refresh in the same instant; needs a write path per platform                                            | Recommended, with a lock                           |
| Read through, delegate refresh              | Never call the token endpoint. Near expiry, run the vendor's own tool and let it rotate                                              | Needs the tool installed; slow; the tool may open a browser on failure                                                                                                                | Recommended as the near-expiry path                |
| `claude setup-token`                        | Mints a one-year token, prints it, saves it nowhere                                                                                  | Not zero login: it opens the same browser flow, which defeats the premise. It is a separate credential, so it does not disturb the person's own login                                 | Reject as the common case, keep as an escape hatch |
| Preseeded terminal, the improved status quo | Terminal with an isolated config home seeded past onboarding                                                                         | Correct and race free by construction: a distinct config home means a distinct credential and a distinct keychain service. Costs one browser login                                    | Keep for the different-account case                |

The recommendation is read-through with delegated refresh near expiry, a cross-process lock around any refresh, and no long-lived copy of a refresh token in recompose's own store. Where the operating system store cannot be written, fail loudly rather than refresh without writing back.

## Prior art

[opencode-claude-auth](https://github.com/griffinmartin/opencode-claude-auth) is the closest match and the most complete. It reads through rather than copying, with a thirty-second in-memory life so an account rotated by something else is picked up mid-session. It refreshes directly when further out and shells out to the vendor tool inside the last minute, the point at which Claude Code rotates anyway. Write-back is on by default, to the keychain on macOS and to the credentials file elsewhere, explicitly to keep the stored credential in step with rotation. It claims to enumerate every `Claude Code-credentials` entry and label each by plan, without disclosing the mechanism.

[CodexBar](https://github.com/steipete/CodexBar/issues/1161) shipped the copy design and regressed its users into daily sign-in. [hermes-agent#21107](https://github.com/NousResearch/hermes-agent/issues/21107) documents the divergence failure: the keychain and the credentials file held different tokens, and the reader took whichever answered first rather than the fresher one. [hermes-agent#22903](https://github.com/NousResearch/hermes-agent/issues/22903) is its Codex twin. [cc-switch#4474](https://github.com/farion1231/cc-switch/issues/4474) reports the write-back gap as a false expiry.

ccusage, claude-code-router, ccflare, and the Mac client sold as a coding-agent front end could not be confirmed as credential adopters from primary sources. Do not cite them.

## Preseeding the config home

For Claude Code the keys are `hasCompletedOnboarding` and a start count above one, with `hasTrustDialogAccepted` and `hasCompletedProjectOnboarding` reachable through `claude config set`. `bypassPermissionsModeAccepted` is not the key that gets written; accepting that warning writes `skipDangerousModePermissionPrompt` into settings instead ([claude-code#65848](https://github.com/anthropics/claude-code/issues/65848)).

Version drift is real and documented. [claude-code#4714](https://github.com/anthropics/claude-code/issues/4714) reports onboarding ignoring settings and environment variables entirely unless the config file exists with the completion flag set. [claude-code#29029](https://github.com/anthropics/claude-code/issues/29029) reports an editor extension overwriting the config and re-triggering onboarding. [claude-code#29056](https://github.com/anthropics/claude-code/issues/29056) reports Windows falsely reading the config as corrupt on exit and wiping the state.

The sign-in method picker is real and is steered by `forceLoginMethod` in managed settings, though the interactive flow preselects rather than enforces. An inherited `ANTHROPIC_API_KEY` produces a separate approval prompt worth avoiding by not passing the variable through. One trap deserves naming: `/logout` also resets the first-launch state, so a seeded home is not seeded forever.

For Codex, `CODEX_HOME` relocates everything, `preferred_auth_method` steers the sign-in screen, and a per-project `trust_level` of trusted suppresses the trust prompt.

## Acceptance references

1. A third-party client that refreshes an adopted Anthropic token on its own signs the person out of Claude Code about once a day ([CodexBar#1161](https://github.com/steipete/CodexBar/issues/1161)). After recompose serves traffic across an expiry boundary, a fresh `claude` run must not ask for a login.
2. Two owners refreshing at once leaves the loser with a hard rejection ([claude-code#24317](https://github.com/anthropics/claude-code/issues/24317), [codex#10332](https://github.com/openai/codex/issues/10332)). Two simultaneous requests on an expired token must produce exactly one refresh, the second waiting on a lock.
3. The Codex eight-day staleness timer forces rotation with an unexpired access token ([CI/CD guide](https://learn.chatgpt.com/docs/auth/ci-cd-auth)). An unexpired access token must not be read as an absence of rotation risk.
4. OpenAI's documentation forbids sharing one credential file across concurrent consumers ([CI/CD guide](https://learn.chatgpt.com/docs/auth/ci-cd-auth)). recompose and the person's own Codex are concurrent consumers, so the design must leave one writer.
5. The keychain item and the credentials file can disagree, and the stale one can win ([hermes-agent#21107](https://github.com/NousResearch/hermes-agent/issues/21107)). Where both exist, compare expiry and take the fresher, never the first that answers.
6. Recent Claude Code versions have moved the token out of the plain keychain item, leaving only server-authorization state behind ([CodexBar#1844](https://github.com/steipete/CodexBar/issues/1844)). A found blob carrying no token must report nothing adoptable rather than adopting an empty shell.
7. The keychain service name is derived from the config directory in recent versions ([openusage#423](https://github.com/robinebers/openusage/issues/423)). Discovery must probe the plain name and the derived name. See `machine-probe.md`, which settles the derivation on this machine.
8. Claude Code has itself shipped a mismatch between the name it writes and the name it reads ([claude-code#9403](https://github.com/anthropics/claude-code/issues/9403)). A miss must name the services probed rather than surfacing a generic authentication error.
9. The login keychain is locked over remote sessions, so the credential is unreachable there ([claude-code#29816](https://github.com/anthropics/claude-code/issues/29816)). A locked keychain must read differently from an absent credential, and must never trigger a refresh that cannot be written back.
10. The command-line reader gets a silent read today because the item's access list trusts that one tool ([Silverfort](https://www.silverfort.com/blog/skipping-the-lock-a-claude-code-cli-weakness-lets-any-macos-process-read-stored-credentials/)). The flow must not depend on the silence, and needs a state for the operating system asking.
11. Keychain prompts return when the reading application's signature changes, including across an update ([Apple Support](https://support.apple.com/guide/keychain-access/if-a-trusted-app-asks-for-keychain-access-kyca1331/mac)). An update must not orphan items, and no recompose window may imitate the system prompt.
12. Dumping the keychain with secrets prompts for the password even as root ([ss64](https://ss64.com/mac/security.html)). Enumeration must derive candidate names rather than dump secrets.
13. Concurrent writers truncate the configuration mid-write ([claude-code#29217](https://github.com/anthropics/claude-code/issues/29217)). Every read must tolerate one parse failure and retry before declaring the credential absent; every write must be a temporary file and a rename.
14. An expired credential still looks present on disk; the vendor surfaces it only through a status line. Adoption must validate before declaring success, and a lapsed credential must read differently from an absent one.
15. Signing out of the vendor tool does not revoke the token, so recompose keeps working after the person believes they revoked it ([claude-code#34198](https://github.com/anthropics/claude-code/issues/34198), [claude-code#43801](https://github.com/anthropics/claude-code/issues/43801)). recompose must offer its own forget action and must not imply the vendor's sign-out reaches it.
16. A Codex credential file in key mode carries no token block at all ([cc-switch#3034](https://github.com/farion1231/cc-switch/issues/3034)). Adoption must read the mode and refuse a key-mode file as a subscription.
17. Newer Codex stores its credential in the operating system keyring under its own service rather than in the file ([auth docs](https://learn.chatgpt.com/docs/auth)). An absent file must not be reported as a signed-out Codex.
18. A failed refresh can wipe the stored credential outright ([claude-code#29896](https://github.com/anthropics/claude-code/issues/29896)). recompose must never delete on a refresh failure; it marks the credential degraded and keeps the blob.
19. Silent infinite retry on a rotated token is the worst-rated symptom ([codex#19803](https://github.com/openai/codex/issues/19803), [codex#25443](https://github.com/openai/codex/issues/25443)). A reuse rejection must stop retrying at once and surface a re-authenticate action.

## Terms of service

Anthropic's legal and compliance page carries an authentication section stating that sign-in through the browser flow is intended for subscribers and for ordinary use of Claude Code and other native Anthropic applications, that developers building products should use key authentication through the console or a supported cloud provider, and that Anthropic does not permit third-party developers to offer Claude sign-in or to route requests through Free, Pro, or Max plan credentials on behalf of their users. Anthropic reserves the right to enforce without notice ([legal and compliance](https://code.claude.com/docs/en/legal-and-compliance)).

Two properties of that wording matter. The prohibition is written about routing requests, not about minting tokens, so it does not distinguish a credential recompose mints from one the person already minted with Anthropic's own tool. And `claude setup-token` produces a subscription token, so it sits inside the same clause rather than around it.

Enforcement history from secondary reporting places the block on third-party subscription access at 2026-01-09 and the documentation clarification at 2026-02-19 ([The Register](https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/)).

For OpenAI no equivalent clause was retrievable; the services agreement refused automated fetch and is not paraphrased here. What is confirmed is that OpenAI's own continuous-integration guide documents copying the credential file from an authenticated machine as a supported headless path, while forbidding concurrent sharing. That restriction reads as operational rather than as licensing.

This section reports what the documents say. The decision about what recompose does with it belongs to the maintainer.

## Open questions

1. How `opencode-claude-auth` enumerates keychain entries. Settled by reading its source; only the README was read.
2. Which versions use which service name, and which hold no token. Partly settled on this machine in `machine-probe.md`; the version boundary is still unknown.
3. Whether Anthropic grants any grace window on a rotated refresh token. No source either way. Settled only by an experiment on a throwaway account.
4. The Anthropic access-token lifetime, reported as both eight and fifteen hours. Settled by reading expiry from the blob rather than by research.
5. Whether Codex on a given machine holds its credential in the file or the keyring. Settled per machine by probing both.
6. Whether Anthropic's clause is enforced against local read-through specifically. The text covers routing regardless of how the credential was obtained, and does not address a local gateway on the person's own machine. Settled only by asking Anthropic.
