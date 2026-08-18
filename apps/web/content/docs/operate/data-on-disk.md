---
title: 'Data on disk'
description: 'Every file recompose writes, and what never leaves the machine.'
---

Everything recompose stores lives under one folder: `~/.recompose`, on every platform. **Settings → Config folder** opens it. Every JSON write is atomic, and recompose renames a file that won't parse aside with a `.corrupt-` timestamp rather than deleting it, so nothing disappears.

## The map

| Path                             | Holds                                                                  | Safe to delete?                   |
| -------------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `settings.json`                  | Every [setting](/docs/operate/settings)                                | Yes, defaults return              |
| `accounts.json`                  | The provider registry: which accounts exist, their labels and policies | No, it disconnects every provider |
| `vault.bin`                      | Provider keys, encrypted                                               | No, accounts lose their secrets   |
| `gateways/<slug>.json`           | One gateway: name, port, canvas, routing, its own key                  | No, it deletes that gateway       |
| `serving-gateways.json`          | Which gateways were serving, for launch restore                        | Yes, the next launch starts quiet |
| `usage.json`                     | [Usage history](/docs/operate/usage-and-spend) in hour buckets         | Yes, it costs history alone       |
| `prices.json`                    | The cached price map                                                   | Yes, the bundled snapshot serves  |
| `logs/main.log`                  | Provider observation lines: status, timing, token counts               | Yes                               |
| `subscriptions/<provider>/<id>/` | Each subscription sign-in's own config home                            | No, it disconnects those sign-ins |
| `plugins/`                       | Engine plugins                                                         | Yes                               |

The log files rotate at 10 MB and keep five generations. They carry no prompts and no bodies, and request ids appear only hashed.

## Secrets, and where they aren't

Provider keys live in `vault.bin`, encrypted through the OS: the login keychain backs it on macOS, and Windows uses its built-in data protection. When the OS offers no encryption, recompose refuses to store a key rather than storing it readable. Linux is the one exception: recompose falls back to plain text there, because many distributions ship no secret service. A gateway's own key is the other exception by design: it lives in plain text inside that gateway's file, for the reasons [Securing a gateway](/docs/operate/securing-a-gateway) gives.

On macOS, Claude sign-ins made through recompose also write items to your login keychain, named `Claude Code-credentials-` plus a short hash. recompose reads your own Claude Code login item and never writes it.

## What never leaves the machine

No telemetry, analytics, or crash reporting exists in the app, and the request log itself never touches disk. The complete list of what recompose reaches out to:

- The providers and sign-in endpoints of accounts you connected
- `raw.githubusercontent.com`, daily, for the price map
- GitHub releases, hourly, for updates
- The two Help menu links, when you click them

Everything else, requests included, travels only where your own canvas points it.

## Back up or reset

The folder is self-contained: copy `~/.recompose` and you've backed up every gateway, account, and setting. Note that the vault decrypts only for the same OS user on the same machine, so a copied vault doesn't move provider keys to new hardware. Deleting the whole folder resets recompose to first launch.
