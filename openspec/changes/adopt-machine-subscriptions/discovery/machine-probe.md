# Machine probe: adopt machine subscriptions

Run in the orchestrating session against the real tools on a real macOS machine, because the research arm can only report what other people wrote down. Every line below is a command that ran and what it printed. Claude Code version 2.1.229, installed through Homebrew at `/opt/homebrew/Caskroom/claude-code@latest/2.1.229/claude`.

## Where each vendor keeps its credential

`security find-generic-password -s "Claude Code-credentials"` returns an item whose `svce` is `Claude Code-credentials` and whose `acct` is the OS login name. The item exists on this machine.

`~/.claude/.credentials.json` does not exist on this machine. The file-backed store the community documents is the fallback for platforms without a keychain, not the macOS path. So the credential itself lives in the keychain on macOS.

The address and the plan don't. `subscription-standing.ts:71` already reads both from `.claude.json`, a plain file that asks the operating system for no permission at all. Detection can therefore name the account from a file read, and only the act of adopting need touch the keychain.

`~/.codex/auth.json` exists, mode `0600`, 4316 bytes. Its top-level keys are `auth_mode`, `OPENAI_API_KEY`, `tokens`, and `last_refresh`. The `tokens` object holds `id_token`, `access_token`, `refresh_token`, and `account_id`.

`~/.gemini/oauth_creds.json` does not exist. No claim about a third provider rests on this machine.

## What a fresh config home does

Setting `CLAUDE_CONFIG_DIR` to an empty scratch directory and running `claude --version` creates nothing. Running `claude config ls` in the same home prints `Not logged in · Please run /login` and creates the home's contents:

```
.claude.json
backups/.claude.json.backup.<epoch>
mcp-needs-auth-cache.json
plugins/installed_plugins.json
projects/<slugged cwd>
sessions
```

Two things this settles. `CLAUDE_CONFIG_DIR` does relocate `.claude.json` into the config home, so a seeded file belongs at `$CLAUDE_CONFIG_DIR/.claude.json` rather than at `~/.claude.json`. And a home the CLI has just built for itself carries these keys and no others:

```
firstStartTime, hasResetAutoModeOptInForDefaultOffer, machineID,
migrationVersion, opusProMigrationComplete, projects, seenNotifications,
sonnet1m45MigrationComplete, userID
```

`hasCompletedOnboarding` is absent from that set, and an absent flag is a falsy flag. That absence is the whole reason a recompose sign-in walks into the onboarding wizard: `subscription-homes.ts` hands the CLI an empty directory, and an empty directory means a first run.

## The seed keys exist in the shipped binary

Grepping the 2.1.229 bundle finds `hasCompletedOnboarding` twelve times and `hasTrustDialogAccepted` ten times. Both keys are live in the version on this machine, so the seed rests on the shipped CLI rather than on a blog post about an older release.

The full set of first-run gates in this version was not enumerated. The bundle is minified and a windowed match over it does not terminate in reasonable time. Settling it belongs in implementation, where a seeded home can be driven against the real CLI and the remaining prompts observed directly.

## The keychain holds six Claude entries, not one

The research arm reported that recent versions derive the keychain service name from the config directory, which contradicted the single-item premise this change started from. `security dump-keychain`, without the flag that reveals secrets and therefore without a password prompt, settles it. The Claude and Codex services on this machine are:

```
Claude Code-credentials
Claude Code-credentials-25e5ffaa
Claude Code-credentials-7fa2dee3
Claude Code-credentials-b3b3d37f
Claude Code-credentials-d9e604a8
Claude Code-credentials-efedcdff
Codex Auth
Codex MCP Credentials
```

The first eight hex characters of the SHA-256 of `/Users/<user>/.claude` on this machine are `86863651`, and no entry carries that suffix while the unsuffixed entry does exist. So the scheme is: **the default home keeps the plain service name, and a custom config home gets `Claude Code-credentials-<first eight of the SHA-256 of the home path>`.**

Two consequences follow directly.

Adoption reads the plain name, because adoption reads what the person's own Claude Code wrote, and that runs in the default home. The premise this change started from holds for the adoption path.

A recompose sign-in does not write the plain name. recompose hands the tool a config home under its own application-support directory, so that login lands under a derived name instead. Any code that watches for a recompose login, or that takes custody of what a recompose login produced, has to derive the name from the home rather than assume the plain one. `credential-custody.ts` names one constant, `VENDOR_SERVICE`, and uses it for both roles.

A first pass failed to trace the suffixed entries, because it looked under the packaged application's support directory, which holds no `subscriptions` folder. The next section traces three of them by searching the whole home directory instead.

`Codex Auth` existing as a keychain service means Codex on this machine may already keep its credential in the keyring rather than in `auth.json`, even though `auth.json` is present. Adoption must probe both rather than treat a missing file as a signed-out Codex.

## The derivation, confirmed against real homes

Walking the home directory for every folder holding a `.claude.json`, then hashing each path, resolves three of the five suffixed entries:

| Suffix     | Config home                                                      |
| ---------- | ---------------------------------------------------------------- |
| `b3b3d37f` | `~/Library/Application Support/@posthog/posthog-code-dev/claude` |
| `d9e604a8` | `~/Library/Developer/Xcode/CodingAssistant/ClaudeAgentConfig`    |
| `7fa2dee3` | `~/.recompose/subscriptions/anthropic/pending`                   |

So the service name is `Claude Code-credentials-` followed by the first eight hex characters of the SHA-256 of the config home's absolute path. This is no longer an inference from a single community report. Two unrelated third-party tools and recompose itself all land where the formula predicts.

## Anthropic sign-in doesn't work on macOS today

The third row is recompose's own pending home, and reading the rest of that install settles what happens to a sign-in.

`~/.recompose/subscriptions/anthropic/` holds `pending` and nothing else. No promoted account home, no `active` pointer. The stored accounts document holds one subscription and its provider is `openai`. So no Anthropic subscription has ever landed on this machine.

The pending home holds a `.claude.json` and no `.credentials.json`. The tool ran, and it wrote its credential to `Claude Code-credentials-7fa2dee3` rather than into the home.

That closes the loop. A sign-in parks the plain item and clears it, runs the tool against a home whose credential lands under a derived name, then polls two places that both stay empty. `subscription-standing.ts:71` reads a `.credentials.json` the tool never writes on macOS, and `keptOutsideTheHome` asks custody about the plain item the sign-in itself just cleared. Five minutes later the poll gives up and the parked credential goes back.

Codex escapes this by accident of its seed. `subscription-homes.ts:27` writes `cli_auth_credentials_store = "file"` for `openai`, which forces that credential into `auth.json` inside the home where the poll can see it. The one provider carrying a seed is the one provider that works.

This raises the custody repair from a precondition into a live defect. Adoption is the only way an Anthropic subscription reaches this app on macOS until the repair lands.

## What this probe does not settle

Whether a copied credential and the original can both refresh without one invalidating the other. Nothing here touches that, and no amount of local file listing will. The research arm owns it, and its answer is that they cannot.

Which config home each suffixed entry belongs to, and which Claude Code version changed the naming scheme.
