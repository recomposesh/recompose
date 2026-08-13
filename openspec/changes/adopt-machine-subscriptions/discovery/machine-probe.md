# Machine probe: adopt machine subscriptions

Run in the orchestrating session against the real tools on a real macOS machine, because the research arm can only report what other people wrote down. Every line below is a command that ran and what it printed. Claude Code version 2.1.229, installed through Homebrew at `/opt/homebrew/Caskroom/claude-code@latest/2.1.229/claude`.

## Where each vendor keeps its credential

`security find-generic-password -s "Claude Code-credentials"` returns an item whose `svce` is `Claude Code-credentials` and whose `acct` is the OS login name. The item exists on this machine.

`~/.claude/.credentials.json` does not exist on this machine. The file-backed store the community documents is the fallback for platforms without a keychain, not the macOS path. Adoption on macOS reads the keychain and nothing else.

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

The five suffixed entries were not traced back to their config homes. The packaged application's support directory holds no `subscriptions` directory at all, so they predate the current layout or come from development runs under a different application name. Tracing them is not worth the time: the derivation is confirmed, and that is what the design needs.

`Codex Auth` existing as a keychain service means Codex on this machine may already keep its credential in the keyring rather than in `auth.json`, even though `auth.json` is present. Adoption must probe both rather than treat a missing file as a signed-out Codex.

## What this probe does not settle

Whether a copied credential and the original can both refresh without one invalidating the other. Nothing here touches that, and no amount of local file listing will. The research arm owns it, and its answer is that they cannot.

Which config home each suffixed entry belongs to, and which Claude Code version changed the naming scheme.
