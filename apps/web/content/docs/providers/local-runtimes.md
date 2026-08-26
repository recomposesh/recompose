---
title: 'Local runtimes'
description: 'Ollama, LM Studio, llama.cpp, and vLLM, found on their own ports.'
---

A local runtime account is a model server on this machine. Connecting one stores no secret and asks for no address: you confirm a port, and recompose observes the rest.

| Runtime             | Documented port   | recompose asks   |
| ------------------- | ----------------- | ---------------- |
| Ollama              | `11434`           | `/api/version`   |
| LM Studio           | `1234`            | `/api/v0/models` |
| llama.cpp           | `8080`            | `/props`         |
| vLLM                | `8000`            | `/version`       |
| Custom local server | The port you name | `/v1/models`     |

Each documented runtime gets asked on its project's own path rather than a shared one. Every server here answers `/v1/models`, so a shared path would report whichever server holds the port as the runtime you picked. The project's own path is how the sheet can tell your runtime from a stranger on its port.

## Connecting

Pick a card and the sheet looks straight away: no button asks permission, because the look is a loopback read that stores nothing. One of three sentences comes back, each naming the address the look went to:

- `Ollama is running at 127.0.0.1:11434.`, with the version where the runtime publishes one
- `Another server answered at 127.0.0.1:11434.`
- `Ollama isn't running at 127.0.0.1:11434. Start it, then check again.`

On an answer, **Add Ollama** leads. On anything else, **Check again** leads and **Add anyway** stands beside it, because adding a server you'll start later is a decision too. Both store through the chosen port.

The port field comes prefilled with the documented port. Type a different one and the look follows it when you press Enter or leave the field, never mid-keystroke.

## What the row shows

The row reads as the runtime's name, its address, and a standing chip: **Running**, **Not running**, or **Another server answered**. The standing is an observation, never a stored fact. The row looks again every time the screen mounts and every time you pick **Check again**, so no row carries a claim older than its own screen.

The overflow menu holds three acts: **Check again**, **Change port**, and **Remove**. Changing the port keeps the row, because a port is where a server answers today rather than a fact about the row. Removing asks no confirmation and releases nothing, since a local account holds no secret.

## Custom local server

The **Custom local server** card covers anything serving models on a local port. It asks for a name and a port, then stores directly: with no project to identify, the first look happens on the row instead. recompose claims no version for it and holds it to no identity beyond answering `/v1/models`.

## Why there's no host field

You name a port, never a host. recompose mints the address as `127.0.0.1:<port>`, so a local account always points at this machine and nowhere else.
