---
title: 'Collect logs'
description: 'What a useful bug report carries, and where each piece lives.'
---

recompose ships no diagnostics exporter and no crash reporter, so you assemble a report by hand from a few known places. The good news: none of them ever hold your prompts or your keys.

## Before you file

Three facts anchor every report:

- **Version**: the About panel carries it, from the app menu on macOS and Help elsewhere.
- **OS and how you installed**: macOS, Windows, or Linux, and dmg, Homebrew, setup exe, AppImage, or deb.
- **What you did and what you expected**: the shortest sequence that shows the problem.

## Where each piece lives

**The refusal body.** The client's own output is the primary evidence: recompose's refusals are full sentences naming the gateway, the router, and the model. Paste the whole JSON. Some refusals appear only there, since [guard-level and pre-routing refusals never reach the request log](/docs/troubleshooting/client-cannot-reach).

**Request log rows.** Open the drawer, walk to the row with the arrow keys, and press Cmd+C or Ctrl+C: one line per row, time through duration. Copy the failing attempt and a healthy neighbor for contrast.

**The provider observation log.** `~/.recompose/logs/main.log`, one line per upstream attempt: provider, model, status, timing, and token counts, with request ids stored only as hashes. It rotates at 10 MB and keeps five files. **Settings → Config folder** gets you there. No prompts, no response bodies, and no credentials ever land in it, so it's safe to attach whole.

**Screenshots.** The canvas with the failing cable selected, and the provider row when the problem touches accounts.

## What to redact

The logs themselves carry no secrets. What does: connect snippets and shell exports, which hold your gateway's key. Replace the key with `rc-local-…` before pasting anything you copied from the connect sheet. Never paste a provider key anywhere.

## File it

**Help → Report an Issue…** opens the repository's new-issue page. A shape that works:

```
Version: 0.3.0, macOS 15.5, installed via Homebrew
Did: sent a request to claude-fast through Claude Code
Expected: an answer from the first child
Got: <the full refusal body>
Rows: <the copied log lines>
main.log: <the matching lines, or attached>
```

A report with the refusal body and the matching log lines usually needs no follow-up round trip, and a partial one is still welcome: file what you have.
