---
title: 'Ports'
description: 'The recompose port band, the manual range, and conflicts.'
---

## Default ports

| What      | Port                                         |
| --------- | -------------------------------------------- |
| Gateways  | One each from the band `8389` through `8436` |
| Ollama    | `11434`                                      |
| LM Studio | `1234`                                       |
| llama.cpp | `8080`                                       |
| vLLM      | `8000`                                       |

The local runtime ports are those projects' own defaults, which is where [detection looks](/docs/providers/local-runtimes).

## How a gateway gets its port

recompose offers a new gateway a free port from its band of 48 ports. The scan starts at a spot derived from the install folder, probes each candidate on both loopback stacks, and wraps around. You can accept the offer or type any port from `1024` through `65535`. With every band port held, the creation sheet says so: `recompose gives gateways the ports 8389 through 8436, and a stored gateway or another process holds every one of them.`

## When ports collide

Two different moments, two different answers:

- **At save**: two gateways can't share a port. The sheet refuses with `<slug> already holds this port.`
- **At start**: another process on the port stops the launch, never the save. The gateway stays stored and stopped, the toolbar reads `Another process holds port 8389.`, and a **Move to a free port** button fixes it in one press.

Neither moment touches sibling gateways: each gateway owns its port and fails alone.

## Binding

Every port binds `127.0.0.1` unless the app-wide bind address says otherwise. [Serving other devices](/docs/operate/serving-other-devices) covers that switch.
