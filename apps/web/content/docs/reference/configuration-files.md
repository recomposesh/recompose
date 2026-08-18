---
title: 'Configuration files'
description: 'The shape of every document under ~/.recompose.'
---

[Data on disk](/docs/operate/data-on-disk) says what each file is for. This page documents the shapes, for reading, scripting, and careful hand edits.

Every document writes atomically and pretty-printed. One that won't parse gets renamed aside as `<file>.corrupt-<timestamp>`, never deleted. One whose `schemaVersion` is newer than the app refuses to load instead, so a downgrade can't quarantine a healthy file.

recompose tolerates hand edits by design: the schemas read a hand-typed document back rather than quarantining it. recompose watches `accounts.json` and the `gateways/` folder and applies edits live, restarting a serving gateway whose document changed and leaving a stopped one stopped. Settings re-read per operation. Only `serving-gateways.json` reads at boot alone.

## settings.json

`schemaVersion: 6`. Fields: `theme` (`system` | `light` | `dark`), `launchAtLogin`, `showInMenuBar`, `firstRequestServed`, `showOnboardingChecklist`, `bindAddress` (default `127.0.0.1`), `startGatewaysOnLaunch`, and `usageRetentionDays` (`7` | `30` | `90`). Older versions migrate forward on load and write back migrated.

## accounts.json

`schemaVersion: 9`. Holds `accounts`, an array over four kinds: `subscription`, `api-key`, `aggregator`, and `local`. Every account carries `id`, `provider`, `kind`, and a label. A credentialed account adds `credentialRef`, pointing into the vault, `keyTail`, the four characters the rows show, and an optional `endpoint` of `{ origin, dialect }` for custom addresses. A local account carries its loopback `address` instead. No secret ever lives in this file, and no standing does either: connected or lapsed comes from a fresh read, never from the file.

## gateways/&lt;slug&gt;.json

`schemaVersion: 4`, one file per gateway. Fields: `slug`, `displayName`, `port` (1024 through 65535), an optional `apiKey` of `{ value, required }` in plain text, `virtualModels`, and `layout`.

Each virtual model is `{ id, displayName, routing }`. The routing graph is `{ entry, nodes }`, where each node is either a target, `{ kind: "target", accountId, providerModel }`, or a router, `{ kind: "router", displayName, policy: { mode }, children }` with mode `failover` or `round-robin`. Saving validates the graph: every child resolves, every node has one parent, everything is reachable, and routers nest at most 4 deep.

## serving-gateways.json

A bare JSON array of slugs, with no version field: the gateways serving at last quit, restored at next launch. Unreadable means empty, and nothing autostarts.

## usage.json

`schemaVersion: 1`. `buckets` accrue per hour of Coordinated Universal Time (UTC), under a tuple of `gateway`, `virtualModel`, `provider`, `providerModel`, `accountId`, and `accountKind`. Each bucket's measures hold `requests`, `failed`, `answered`, `durationMsSum`, and a `tokens` object splitting `input`, `output`, `cacheRead`, `cacheWrite`, `reasoning`, and `total`. No money field exists anywhere in the file: [recompose computes spend at read time](/docs/operate/usage-and-spend).

## prices.json

No version field: `{ fetchedAt, payload }`, where the payload is the raw LiteLLM price map as fetched.

## `vault.bin`

JSON despite the extension: `{ schemaVersion: 1, entries }`, where each entry maps a `credentialRef` to the OS-encrypted ciphertext of one provider key, base64-encoded. Nothing inside reads back without the same OS user on the same machine.
